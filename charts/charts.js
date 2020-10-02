'use strict';

const fetch_options = { cache: "no-cache" };  // force-validate if the data we're getting is sufficiently new
const datakey = "data";

async function init() {
  try {
    let search_params = new URLSearchParams(document.location.search)
    if (search_params.has(datakey)) {
      let jfname = search_params.get(datakey);
      new femtochart(document.getElementById('myChart1'), JSON.parse(await read_json('./data/' + jfname + '.json') ));
    } else {
      const chart = document.getElementById('myChart1');
      chart.parentElement.removeChild(chart);
      const chart_list = [  // todo: load from external list file?
        {name: "Distinct users (daily)", data: "distinct_userid"},
      ];
      for (const piece of chart_list) {
        let el = document.createElement('a');
        el.text = piece.name;
        el.href = document.location + "?" + datakey + "=" + piece.data;  // TODO: find correct and elegant way for this
        document.body.appendChild(el);
        document.body.appendChild(document.createElement('br'));
      }
    }
  } catch (e) {
    let error = "Something broke ;(. Error message: " + e.message;
    document.body.innerHTML = error;
  }
}

async function read_json(filename) {
  let [file_data] = await Promise.all( [ fetch(filename, fetch_options) ] );
  let [file_text] = await Promise.all( [ file_data.text() ] );
  return file_text;
}
