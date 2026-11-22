import { languages } from "./i18n.js";

export const sheetUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTLijcKeS2RHrfgzoQaeZl_qcVD5o5DRxF7kPGMQRmfX_Hv4So1wYP4IyrdZiNuj2d8w6YscOeoau4k/pub?gid=0&single=true&output=csv";

const categories = {
  heritage: { hu: "Kulturális örökség", en: "Cultural heritage", bg: "Културно наследство" },
  nature: { hu: "Természet", en: "Nature", bg: "Природа" },
  village: { hu: "Település", en: "Village", bg: "Селище" },
  hiking: { hu: "Túra", en: "Hiking", bg: "Пешеходен туризъм" },
};

export function foldText(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const categoryCodes = new Map(
  Object.entries(categories).flatMap(([code, labels]) =>
    [code, ...Object.values(labels)].map((label) => [foldText(label), code]),
  ),
);

export function parseCsv(source) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n") + "\n";
  const rows = [];
  let fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[index + 1] === '"') {
        field += char;
        index += 1;
      } else {
        quoted = false;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === "," || char === "\n") {
      fields.push(field.trim());
      field = "";
      if (char === "\n") {
        if (fields.some(Boolean)) rows.push(fields);
        fields = [];
      }
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Unclosed quote in catalog CSV");
  return rows;
}

function headerKey(header) {
  return foldText(header).replace(/[\s-]+/g, "_");
}

function translated(row, field, fallbacks = {}) {
  return Object.fromEntries(languages.map((language) => [
    language, row[field + "_" + language] || fallbacks[language] || "",
  ]));
}

function webUrl(value, base) {
  if (!value) return "";
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function validPair(pair) {
  return Array.isArray(pair) && pair.length >= 2 &&
    Number.isFinite(pair[0]) && Math.abs(pair[0]) <= 180 &&
    Number.isFinite(pair[1]) && Math.abs(pair[1]) <= 90;
}

function validLine(line) {
  return Array.isArray(line) && line.length >= 2 && line.every(validPair);
}

export function readGeometry(value) {
  if (!value || typeof value !== "object") return null;
  if (value.type === "Feature") return readGeometry(value.geometry);
  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    const shapes = value.features.map(readGeometry);
    if (shapes.length === 1) return shapes[0];
    if (shapes.length && shapes.every((shape) => shape && shape.type !== "Point")) {
      return {
        type: "MultiLineString",
        coordinates: shapes.flatMap((shape) =>
          shape.type === "LineString" ? [shape.coordinates] : shape.coordinates),
      };
    }
  }

  const { type, coordinates } = value;
  if (
    (type === "Point" && validPair(coordinates)) ||
    (type === "LineString" && validLine(coordinates)) ||
    (type === "MultiLineString" && Array.isArray(coordinates) &&
      coordinates.length > 0 && coordinates.every(validLine))
  ) {
    return { type, coordinates };
  }
  return null;
}

function inlineGeometry(text) {
  if (!text) return null;
  try {
    return readGeometry(JSON.parse(text));
  } catch {
    return null;
  }
}

function pointGeometry(row) {
  const position = row.pozicio || row.position || "";
  const separator = position.includes(";") ? ";" : ",";
  const parts = position.split(separator);
  const [positionLat, positionLng] = parts.length === 2 ? parts.map((part) => part.trim()) : [];
  const lat = row.lat || row.latitude || positionLat;
  const lng = row.lng || row.lon || row.longitude || positionLng;
  if (!lat || !lng) return null;

  const coordinates = [Number(lng.replace(",", ".")), Number(lat.replace(",", "."))];
  return validPair(coordinates) ? { type: "Point", coordinates } : null;
}

async function download(url) {
  const response = await fetch(url, {
    credentials: "omit",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Catalog request failed (" + response.status + ")");
  return response;
}

export async function loadCatalog(url, base) {
  const response = await download(url);
  const [rawHeaders, ...data] = parseCsv(await response.text());
  const headers = rawHeaders?.map(headerKey) || [];
  const nameHeader = /^(elnevezes|name(?:_hu|_en|_bg)?)$/;
  if (!headers.some((header) => nameHeader.test(header))) {
    throw new Error("No name column in catalog CSV");
  }

  const geometryCache = new Map();
  function fetchGeometry(file) {
    if (!geometryCache.has(file)) {
      const geometry = download(file)
        .then((result) => result.json())
        .then(readGeometry)
        .catch(() => null);
      geometryCache.set(file, geometry);
    }
    return geometryCache.get(file);
  }

  const items = await Promise.all(data.map(async (fields, index) => {
    const row = Object.fromEntries(headers.map((header, position) => [header, fields[position] || ""]));
    const name = translated(row, "name", { hu: row.elnevezes || row.name });
    if (!Object.values(name).some(Boolean)) return null;

    const description = translated(row, "description", { hu: row.leiras || row.description });
    const categoryName = row.category || row.kategoria || row.category_hu || row.category_en || row.category_bg || "";
    const normalizedCategory = foldText(categoryName);
    const standardCategory = categoryCodes.get(normalizedCategory);
    const categoryKey = standardCategory || normalizedCategory;
    const category = translated(row, "category", categories[standardCategory] || { hu: categoryName });
    const localityName = row.locality || row.helyszin || row.locality_hu || row.locality_en || row.locality_bg || "";
    const locality = translated(row, "locality", { hu: localityName });
    const localityKey = foldText(localityName);

    const file = webUrl(row.geojson_url, base);
    const isRoute = /^(route|line|linestring|multilinestring|utvonal)$/.test(
      foldText(row.geometry_type || ""),
    );
    let geometry = inlineGeometry(row.geojson || row.pozicio || row.position);
    if (!geometry && file) geometry = await fetchGeometry(file);
    if (!geometry && !isRoute) geometry = pointGeometry(row);

    return {
      key: (row.id || "row") + ":" + (index + 2),
      name,
      description,
      category,
      categoryKey,
      locality,
      localityKey,
      geometry,
      kind: geometry ? (geometry.type === "Point" ? "point" : "route") : (isRoute ? "route" : "point"),
      image: webUrl(row.image_url || row.kep, base),
      imageAlt: translated(row, "image_alt"),
      imageAuthor: row.image_author,
      imageSource: webUrl(row.image_source_url, base),
      imageLicense: row.image_license,
      imageLicenseUrl: webUrl(row.image_license_url, base),
      website: webUrl(row.website_url, base),
      searchText: foldText([
        ...Object.values(name), ...Object.values(description), ...Object.values(category),
        ...Object.values(locality), row.tags || "",
      ].join(" ")),
    };
  }));
  return items.filter(Boolean);
}

export function matchingItems(items, filters) {
  const tokens = foldText(filters.search.trim()).split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    (!filters.category || item.categoryKey === filters.category) &&
    (!filters.locality || item.localityKey === filters.locality) &&
    (!filters.type || item.kind === filters.type) &&
    tokens.every((token) => item.searchText.includes(token)),
  );
}
