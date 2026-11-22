const regionCenter = [42.1271, 23.2207];
const defaultZoom = 11;
const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const contourBounds = [[42.063, 23.106], [42.192, 23.409]];
const contourUrl = new URL("./assets/maps/rila-contours.png", import.meta.url).href;
const contourCredit = '<a href="https://registry.opendata.aws/terrain-tiles/">Mapzen</a>';

export function createMap(container, fitButton, notice, selectItem, initialLabels) {
  const L = window.L;
  if (!L) {
    notice.textContent = initialLabels.mapError;
    notice.hidden = false;
    fitButton.disabled = true;
    return null;
  }

  let labels = initialLabels;
  let tileIssue = false;
  let failedTiles = 0;
  const layersByKey = new Map();
  const map = L.map(container, {
    scrollWheelZoom: false,
    zoomControl: false,
  }).setView(regionCenter, defaultZoom);
  const tiles = L.tileLayer(tileUrl, { maxZoom: 19, attribution });
  const zoom = L.control.zoom({ position: "topright" }).addTo(map);
  const features = L.featureGroup().addTo(map);
  const icon = L.divIcon({
    className: "place-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

  function showTileState() {
    notice.textContent = labels.tileError;
    notice.hidden = !tileIssue;
  }

  tiles.on("loading", () => { failedTiles = 0; });
  tiles.on("tileerror", () => { failedTiles += 1; });
  tiles.on("load", () => {
    tileIssue = failedTiles > 0;
    showTileState();
  });
  tiles.addTo(map);
  L.imageOverlay(contourUrl, contourBounds, {
    opacity: 0.58,
    attribution: contourCredit,
  }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

  function setLabels(strings) {
    labels = strings;
    const [increase, decrease] = zoom.getContainer().querySelectorAll("a");
    increase.title = labels.zoomIn;
    increase.setAttribute("aria-label", labels.zoomIn);
    decrease.title = labels.zoomOut;
    decrease.setAttribute("aria-label", labels.zoomOut);
    showTileState();
  }
  setLabels(labels);

  map.on("popupopen", ({ popup }) => {
    const close = popup.getElement().querySelector(".leaflet-popup-close-button");
    close?.setAttribute("aria-label", labels.close);
  });

  function fitItems() {
    map.invalidateSize({ pan: false });
    const bounds = features.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15, animate: false });
    } else {
      map.setView(regionCenter, defaultZoom, { animate: false });
    }
  }

  fitButton.addEventListener("click", fitItems);
  fitButton.disabled = true;

  function setItems(items, nameOf, localityOf, fit) {
    map.closePopup();
    features.clearLayers();
    layersByKey.clear();
    for (const item of items) {
      if (!item.geometry) continue;

      const name = nameOf(item);
      const [layer] = L.geoJSON(item.geometry, {
        pointToLayer: (_feature, position) => L.marker(position, { icon, title: name, alt: name }),
        style: { color: "#9e3e31", weight: 5, dashArray: "9 5" },
      }).getLayers();
      layer.addTo(features);
      layersByKey.set(item.key, layer);

      const popup = document.createElement("div");
      popup.className = "point-popup";
      const title = document.createElement("strong");
      title.textContent = name;
      popup.append(title);
      const locality = localityOf(item);
      if (locality) {
        const subtitle = document.createElement("span");
        subtitle.textContent = locality;
        popup.append(subtitle);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button";
      button.textContent = labels.details;
      button.addEventListener("click", () => selectItem(item));
      popup.append(button);
      layer.bindPopup(popup, { maxWidth: 260 });

      const element = layer.getElement();
      element?.setAttribute("aria-label", name);
      if (item.kind === "route" && element) {
        element.setAttribute("tabindex", "0");
        element.setAttribute("role", "button");
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            layer.openPopup();
          }
        });
      }
    }

    fitButton.disabled = layersByKey.size === 0;
    if (fit) fitItems();
  }

  function focusItem(key) {
    const layer = layersByKey.get(key);
    if (!layer) return;
    map.invalidateSize({ pan: false });

    if (layer instanceof L.Marker) {
      map.setView(layer.getLatLng(), 15, { animate: false });
    } else {
      map.fitBounds(layer.getBounds(), { padding: [45, 45], maxZoom: 15, animate: false });
    }
    layer.openPopup();
    layer.getElement()?.focus({ preventScroll: true });
  }

  return { setLabels, setItems, fitItems, focusItem };
}
