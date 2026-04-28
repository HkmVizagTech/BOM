// 🔹 Download as Excel
function downloadExcel() {
  const pax = parseFloat(document.getElementById("pax").value || 0);
  const day = document.getElementById("day").value;
  const filtered = dataStore
    .filter((d) => d.day === day)
    .sort((a, b) => (a.slno || 0) - (b.slno || 0));

  // Group by menu
  const grouped = {};
  filtered.forEach((item) => {
    if (!grouped[item.menu]) grouped[item.menu] = [];
    const perHead = item.base / 1000;
    const finalQty = perHead * pax;
    if (finalQty === 0) return;
    grouped[item.menu].push({
      ingredient: item.ingredient,
      qty: finalQty,
    });
  });

  // Prepare rows for Excel
  let rows = [["Menu Item", "Ingredients", "quantity in KG"]];
  for (let menu in grouped) {
    grouped[menu].forEach((i, idx) => {
      if (idx === 0) {
        rows.push([menu, i.ingredient, i.qty]);
      } else {
        rows.push(["", i.ingredient, i.qty]);
      }
    });
  }

  if (rows.length === 1) {
    alert("No data to export for the selected day.");
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ingredients");

  // Sanitize file name
  let safeDay = (day || "day").replace(/[^a-z0-9_\-]/gi, "_");
  let fileName = `ingredients_${safeDay}.xlsx`;

  try {
    const a = document.createElement("a");
    a.download = fileName;
    const wboutBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    a.href =
      "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
      wboutBase64;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  } catch (e) {
    console.error("Excel download error:", e);
    alert(`Download failed: ${e && e.message ? e.message : "Unknown error"}`);
  }
}

// Download button event
document
  .getElementById("downloadExcel")
  .addEventListener("click", downloadExcel);

// 🔐 Replace these
const API_KEY = "patiwJ4wkDN5iItCl.2aa7e34501644898758f8cecc6952ed8b39f53b2dceff71afcf315c7386c2844";
const BASE_ID = "appOg1CuLa96HTpbQ";
const TABLE_NAME = "meal_ingredients";

const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

let dataStore = [];

// 🔹 Fetch Airtable Data
async function fetchData() {
  try {
    const res = await fetch(AIRTABLE_URL, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const data = await res.json();

    // Handle authentication or other API errors gracefully
    if (!res.ok || !data.records) {
      if (res.status === 401) {
        throw new Error("Unauthorized (401): Please restore your Airtable API Key in app.js. (Make sure not to push it to GitHub!)");
      } else if (res.status === 404) {
        throw new Error("Not Found (404): Please check your Airtable Base ID and Table Name.");
      }
      throw new Error(data.error?.message || "Failed to fetch data from Airtable.");
    }

    // 🔥 Clean mapping (IMPORTANT)
    dataStore = data.records.map((r) => ({
      slno: r.fields["SL.NO"] || 0,
      day: r.fields["Day"],
      menu: (r.fields["Menu Name"] || "").replace(/\n/g, " ").trim(),
      ingredient: r.fields["Ingredient"],
      base: r.fields["Base Qty (for 1000)"] || 0,
    }));

    populateDays();
    render();
  } catch (err) {
    document.getElementById("output").innerHTML = "Error loading data";
    console.error(err);
  }
}

// 🔹 Populate Day Dropdown
function populateDays() {
  const days = [...new Set(dataStore.map((d) => d.day))];

  const select = document.getElementById("day");
  select.innerHTML = "";

  days.forEach((day) => {
    const opt = document.createElement("option");
    opt.value = day;
    opt.textContent = day;
    if (day === "Monday") opt.selected = true;
    select.appendChild(opt);
  });
}

// 🔹 Render UI
function render() {
  const pax = parseFloat(document.getElementById("pax").value || 0);
  const day = document.getElementById("day").value;

  // Filter and sort by SL.NO
  const filtered = dataStore
    .filter((d) => d.day === day)
    .sort((a, b) => (a.slno || 0) - (b.slno || 0));

  const grouped = {};

  filtered.forEach((item) => {
    if (!grouped[item.menu]) grouped[item.menu] = [];

    // 🔥 Correct calculation
    const perHead = item.base / 1000;
    const finalQty = perHead * pax;

    // ❌ Skip zero values (clean UI)
    if (finalQty === 0) return;

    grouped[item.menu].push({
      ingredient: item.ingredient,
      qty: finalQty.toFixed(2),
    });
  });

  let html = `<div class="results-card">
      <table class="results-table">
        <thead>
          <tr>
            <th>Menu Item</th>
            <th>Ingredient</th>
            <th>Quantity (KG)</th>
          </tr>
        </thead>
        <tbody>`;

  for (let menu in grouped) {
    grouped[menu].forEach((i, idx) => {
      // Add a class to the first row of each menu for bold border
      const rowClass = idx === 0 ? "menu-separator" : "";
      html += `
        <tr class="${rowClass}">`;
      if (idx === 0) {
        html += `<td class="menu-cell" rowspan="${grouped[menu].length}">${menu}</td>`;
      }
      html += `<td>${i.ingredient}</td>
          <td class="qty-cell">${i.qty}</td>
        </tr>`;
    });
  }

  html += `
        </tbody>
      </table>
    </div>`;

  document.getElementById("output").innerHTML = html;
}

// 🔹 Events
document.getElementById("pax").addEventListener("input", render);
document.getElementById("day").addEventListener("change", render);

// 🔹 Init
fetchData();
