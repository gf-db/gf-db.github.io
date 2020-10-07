'use strict';

const fetch_options = { cache: "no-cache" };  // force-validate if the data we're getting is sufficiently new
const datakey = "data";
const daily_filter = { type: "mask", indices: [110,264,382,401,402,507,586] };

async function init() {
  try {
    const search_params = new URLSearchParams(document.location.search);
    if (search_params.has(datakey)) {
      let json = await read_json('./data/' + search_params.get(datakey) + '.json');
      if (json["time_step"] == 86400) {  // todo: where to put this?
        json["filter"] = daily_filter;
      }
      const chart_element = document.body.appendChild(document.createElement('canvas'));
      new femtochart(chart_element, json);
    } else {
      const chart_list = await read_json('chart_list.json');
      for (const sublist of chart_list) {
        for (const piece of sublist) {
          if (piece.name === undefined || piece.data === undefined) { continue; }
          let el = document.createElement('a');
          el.text = piece.name;
          el.href = document.location + "?" + datakey + "=" + piece.data;  // TODO: find correct and elegant way for this
          document.body.appendChild(el);
          document.body.appendChild(document.createElement('br'));
        }
        document.body.appendChild(document.createElement('br'));
      }
    }
  } catch (e) {
    const loc = document.location;
    const source_page = loc.protocol + "//" + loc.host + loc.pathname;
    let error = "Something broke ;(. Error message: " + e.message + "<br>" +
                "Try opening the <a href='" + source_page + "'>main charts page</a> instead?";
    document.body.innerHTML = error;
  }
}

async function read_json(filename) {
  let [file_data] = await Promise.all( [ fetch(filename, fetch_options) ] );
  let [file_text] = await Promise.all( [ file_data.text() ] );
  return JSON.parse(file_text);
}
