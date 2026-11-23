const brick = "#913a31";
const blue = "#304b66";
const green = "#465a3e";
const ink = "#35332e";
const paper = "#faedcb";

function circle(x, y, radius) {
  return "M" + (x - radius) + " " + y +
    "a" + radius + " " + radius + " 0 1 0 " + (radius * 2) + " 0" +
    "a" + radius + " " + radius + " 0 1 0 " + (-radius * 2) + " 0Z";
}

// Original spot-ink symbols on a 24-unit grid.
const pictograms = {
  village: {
    color: brick,
    fill: "M2.2 12 7.15 7.6 12.1 12h-1.6v8H8.4v-3.4H6v3.4H3.7v-8z " +
      "M10.45 9.5 16.8 3.9 23.1 9.5h-1.9V20h-2.8v-4.1h-3.2V20h-2.8V9.5z",
  },
  heritage: {
    color: brick,
    fill: "M2 8.65 12 3l10 5.65v1.65H2z M4.5 11.3h3.2v7.3H4.5z " +
      "M10.4 11.3h3.2v7.3h-3.2z M16.3 11.3h3.2v7.3h-3.2z M2.5 19.4h19v2.1h-19z",
  },
  nature: {
    color: green,
    fill: "M12 2 17.3 10.1h-2.5l4.5 5.2h-3.4l4.9 4.5h-7.4v2h-2.8v-2H3.2l4.9-4.5H4.7l4.5-5.2H6.7z",
  },
  menedekhaz: {
    color: blue,
    fill: "M2 13.1 12 3.6l10 9.5h-2.5v7.6h-5.05v-6.5h-4.9v6.5H4.5v-7.6z",
    stroke: "M17.55 8.5V4.7h2.1v5.9",
  },
  sziklamaszas: {
    color: ink,
    fill: "M21.8 2.7h-3.55l-1.4 5.4 1 2.6-2.9 3.15-1.35 7.4h8.2z " + circle(8.8, 6.25, 1.55),
    stroke: "M9.35 9.05 13 10.2l3.05-3.4M9.85 9.4l-1.5 4.25L5.5 17.9M8.35 13.65l4.6 1.15-1.55 4.4M9.15 10.2l-3.3 1.45",
  },
  furdo: {
    color: blue,
    stroke: circle(12, 12, 9.1) +
      "M5.8 10.25c1.45-1.45 2.7-1.45 4.2 0s2.65 1.45 4.15 0 2.5-1.45 4.05-.3 " +
      "M5.8 14.15c1.45-1.45 2.7-1.45 4.2 0s2.65 1.45 4.15 0 2.5-1.45 4.05-.3",
  },
  siterep: {
    color: blue,
    fill: circle(10.65, 4.1, 1.8),
    stroke: "M10.1 7.25l4.25 2.1 2.1 2.7M10.2 7.45l-1.15 5.2 4.35 2.7-2.15 3.5 " +
      "M9.1 12.65l-3.25 4.7M16.45 11.85l2.45 5.55M2.1 16.55l17.35 4.75q1.25.3 2.75-.6",
  },
  vendeglatas: {
    color: blue,
    fill: "M18.2 3.1c-3.45 1.45-4.65 4.5-4.65 9.4h2.7v8.55h2.5V3.1z",
    stroke: "M4.1 3.4v5.25Q4.1 12 7.3 12t3.2-3.35V3.4M7.3 3.4v17.5",
  },
  boraszat: {
    color: brick,
    fill: circle(8, 9.35, 2.3) + circle(13.25, 9.35, 2.3) + circle(18.5, 9.35, 2.3) +
      circle(10.65, 14.22, 2.3) + circle(15.9, 14.22, 2.3) + circle(13.25, 19.07, 2.3),
    stroke: "M13.25 7.1q.15-3.45 3.8-4.25M13.45 5.35l-3.15-2",
  },
  bevasarlas: {
    color: blue,
    fill: "M4.45 8.65h15.1l.95 12.2h-17z",
    stroke: "M8.3 9.1V7a3.7 3.7 0 0 1 7.4 0v2.1",
  },
  hiking: {
    color: brick,
    fill: "M5 3.9h7v5l3.55 4.25 4.75 1.1 1.05 4.15-2.65 2.1H3.7V17h2.5l.55-7.4H5z",
    stroke: "M9.4 7.7h3.45M10.1 10.1l3.95-.45",
  },
  other: {
    color: ink,
    fill: circle(12, 12, 2.4),
    stroke: "M12 3.5 20.5 12 12 20.5 3.5 12z",
  },
};

const renderedPictograms = new Map();

function paintPictogram(pictogram) {
  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;
  const context = canvas.getContext("2d");
  context.scale(3, 3);
  context.lineCap = "round";
  context.lineJoin = "round";

  const fill = pictogram.fill && new Path2D(pictogram.fill);
  const stroke = pictogram.stroke && new Path2D(pictogram.stroke);
  context.strokeStyle = paper;
  context.lineWidth = 2.65;
  if (fill) context.stroke(fill);
  context.lineWidth = 4.35;
  if (stroke) context.stroke(stroke);

  context.fillStyle = pictogram.color;
  if (fill) context.fill(fill);
  context.strokeStyle = pictogram.color;
  context.lineWidth = 1.7;
  if (stroke) context.stroke(stroke);
  return canvas;
}

export function createPictogram(categoryKey) {
  const key = Object.hasOwn(pictograms, categoryKey) ? categoryKey : "other";
  if (!renderedPictograms.has(key)) {
    renderedPictograms.set(key, paintPictogram(pictograms[key]));
  }
  const drawing = renderedPictograms.get(key);
  const pictogram = drawing.cloneNode();
  pictogram.getContext("2d").drawImage(drawing, 0, 0);
  pictogram.className = "map-pictogram";
  pictogram.dataset.symbol = key;
  pictogram.setAttribute("aria-hidden", "true");
  return pictogram;
}

export function pointLegendEntry(categoryKey, label) {
  const item = document.createElement("li");
  const name = document.createElement("span");
  name.textContent = label;
  item.append(createPictogram(categoryKey), name);
  return item;
}
