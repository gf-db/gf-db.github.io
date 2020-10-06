'use strict';

const offset_down = 20;
const offset_left = 35;
const offset_up   = 15;
const offset_right= 20;

const minor_count = 4;  // todo remove
const major_length = 3;  // change lengths to 3.5 for slightly more prominent ticks
const minor_length = 3;

// TODO: read font metrics instead
const vtext_offsets = [-17,  -3];
const htext_offsets = [  0, -12];

const aa_shift = 0.5;

const vw = Math.max(document.documentElement.clientWidth  || 0, window.innerWidth  || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

const ms_in_sec = 1000;
const sec_in_hour = 3600;
const hour_in_day = 24;
const sec_in_day = sec_in_hour * hour_in_day;
const days_in_week = 7;

// TODO: move all of this into options, but retain some as defaults
const style_background = "white";
const style_major_gridline = "rgba(0, 0, 0, 0.125)";  // transparent black == grey
const style_minor_gridline = "rgba(0, 0, 0, 0.03125)";  // almost entirely transparent
const style_axis = "black";
const style_tick = "black";
const style_chart_stroke = "black";
const style_chart_fill = "rgba(128, 255, 0, 0.2)";  // transparent green
const style_fail_fill = "rgba(255, 0, 0, 0.2)";  // transparent red
const style_text = "black";

/*
// Night theme (incomplete, todo)
const style_background = "black";
const style_major_gridline = "rgba(255, 255, 255, 0.125)";
const style_minor_gridline = "rgba(255, 255, 255, 0.03125)";  // almost entirely transparent
const style_axis = "white";
const style_tick = "white";
const style_chart_stroke = "white";
const style_chart_fill = "rgba(128, 255, 0, 0.2)";  // transparent green
const style_fail_fill = "rgba(255, 0, 0, 1)";  // transparent red
const style_text = "white";
*/

class femtochart {
  constructor() {
    this.canvas = arguments[0];
    this.opt    = arguments[1];

    this.init();
    this.draw_axes();
    this.draw_ticks();
    this.draw_grid();
    this.draw_labels();
    this.draw_charts();
  }

// ----------------------------------------------------------------------------
  init() {
    this.ctx = this.canvas.getContext('2d');

    this.pixel_width = 2;  // TODO: maybe let user set instead?
    this.canvas.height = vh * 0.48;  // TODO: fill most of the screen?
    this.canvas.width = this.opt.data.length * this.pixel_width + offset_left + offset_right;  // this is non-negotiable, sorry
    const [htick_size, major_count] = this.round_max(this.opt.data);
    this.pixel_height = (this.canvas.height - offset_up - offset_down)/(htick_size * major_count);

    // draw background here because it looks simpler before the context transform
    this.ctx.fillStyle = style_background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // flip the canvas upside down to normal x-y axes orientation and offset by 0.5 to avoid antialias on integer values
    this.ctx.setTransform(1, 0, 0, -1, aa_shift, this.canvas.height - aa_shift);  // horz scale, horz skew, vert skew, vert scale, horz move, vert move
    this.ctx.translate(offset_left, offset_down);
    this.ctx.textAlign = 'center';

    // set line dash offset to avoid antialias on dash line ends too
    this.ctx.lineDashOffset = aa_shift;
    //this.ctx.setLineDash([3, 3]);

    // calc width and height of inner chart area
    this.w = this.canvas.width - offset_left - offset_right;
    this.h = this.canvas.height - offset_up - offset_down;

    // init time and date formatters
    this.date_fmt = new Intl.DateTimeFormat('default', { year: '2-digit', month: 'short' } );
    this.time_fmt = new Intl.DateTimeFormat('default', { hour12: false, hour: '2-digit', minute: '2-digit' } );

    // if the filter is set, then filter input data
    if (this.opt.filter !== undefined) {
      this.filter_input_data(this.opt.data, this.opt.filter);
    }

    //
    [this.horz_major_ticks, this.horz_minor_ticks] = this.generate_horz_ticks(this.opt);
    [this.vert_major_ticks, this.vert_minor_ticks] = this.generate_vert_ticks(this.opt);
  }

// ----------------------------------------------------------------------------
  round_max(data) {
    const exact_max = Math.max(...data);  // TODO: bench spread perf

    let htick_size = Math.pow(10, Math.floor(Math.log10(exact_max)));
    let major_count = exact_max/htick_size;

    // TODO: use min_major and max_major settings to control subdivisions
    // alternatively, use min_used_fraction setting to control it (minimum of max_data_value / max_possible_value)
    let extra = 1;
    if (major_count <= 2) {
      extra = 5;
    } else if (major_count <= 5) {
      extra = 2;
    }
    htick_size /= extra;
    major_count = Math.ceil(major_count * extra);

    return [htick_size, major_count];
  }

// ----------------------------------------------------------------------------
  format_vert_label(num) {  // format y-axis major tick label text
    const powers = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];  // as if we'll use anything above the first three
    const div = Math.pow(10, 3);
    let i = 0;
    while (i < powers.length-1 && num >= div) {
      num /= div;
      i++;
    }
    return num + " " + powers[i];
  }

// ----------------------------------------------------------------------------
  format_horz_label(i) {  // format x-axis major tick label text
    const date = this.index_to_date(i, this.opt);
    if (this.opt.time_step == sec_in_day) {
      return this.date_fmt.format(date);
    } else {  // always, really? todo
      return this.time_fmt.format(date);
    }
  }

  index_to_date(index, opt) {
    return new Date(ms_in_sec * (opt.start_time + index * opt.time_step));
  }

  date_diff_days(start, end) {
    return (end-start)/ms_in_sec/sec_in_day;
  }

// ----------------------------------------------------------------------------
  generate_horz_ticks(opt) {  // returns an array of indices for horizontal ticks based on input data/options
    let [major, minor] = [[], []];
    const len = opt.data.length;
    const ts = opt.time_step;
    const minor_width = sec_in_hour / minor_count;  // 15-minute minor ticks for intraday charts
    const weekday_offset = this.index_to_date(0, this.opt).getDay();
    if (ts == sec_in_day) {
      this.push_helper(major, len, this.days_to_next_month);  // monthly majors
      this.push_helper(minor, len, days_in_week, weekday_offset);  // weekly minors
    } else {
      this.push_helper(major, sec_in_day / ts, sec_in_hour / ts);  // hourly majors
      this.push_helper(minor, sec_in_day / ts, minor_width / ts);  // same count of minor ticks as vertical axis
    }
    return [major, minor];
  }

  generate_vert_ticks(opt) {  // returns an array of values for vertical ticks based on input data/options
    let [major, minor] = [[], []];
    const [htick_size, major_count] = this.round_max(opt.data);  // second time calling this (full input array processing); todo: consider deduping
    this.push_helper(major, htick_size * major_count, htick_size);
    this.push_helper(minor, htick_size * major_count, htick_size / minor_count);
    return [major, minor];
  }

  push_helper(arr, limit, next, offset) {
    let x = 0;
    if (offset !== undefined) {
      x = offset;
    }
    const is_func = (typeof(next) === 'function');
    while (x <= limit) {
      arr.push(x);
      if (is_func) {  // I don't like this part
        x = next.call(this, x);
      } else {
        x += next;
      }
    }
  }

  days_to_next_month(index) {
    let start = this.index_to_date(index, this.opt);
    let end = new Date(start);
    end.setMonth(start.getMonth() + 1, 1);
    return index + this.date_diff_days(start, end);
  }

// ----------------------------------------------------------------------------
  filter_input_data(array, filter) {
    switch (filter["type"]) {
      case "mask":  // linear interpolation
        // extrapolation could quickly result in weird values, so we deliberately skip doing it
        for (const ind of filter["indices"]) {
          array[ind] = (array[ind-1] + array[ind+1])/2;  // TODO: multiple adjacent indices, first and last indices; out of bounds indices
        }
        break;
      case "remove":  // remove entirely
        for (const ind of filter["indices"]) {
          array[ind] = null;
        }
        break;
      case "leave": // leave as-is
      default:  // unknown option
        break;
    }
  }

// ============================================================================
  draw_axes() {
    const ctx = this.ctx;

    ctx.strokeStyle = style_axis;
    ctx.beginPath();
    ctx.moveTo(this.w, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, this.h);
    ctx.stroke();
  }

// ----------------------------------------------------------------------------
  draw_ticks() {
    const ctx = this.ctx;

    ctx.strokeStyle = style_tick;
    ctx.beginPath();
    this.draw_line_helper(this.vert_major_ticks, -major_length, true);
    this.draw_line_helper(this.vert_minor_ticks,  minor_length, true);
    this.draw_line_helper(this.horz_major_ticks, -major_length, false);
    this.draw_line_helper(this.horz_minor_ticks,  minor_length, false);
    ctx.stroke();
  }

// ----------------------------------------------------------------------------
  draw_grid() {
    const ctx = this.ctx;

    ctx.strokeStyle = style_major_gridline;
    ctx.beginPath();
    this.draw_line_helper(this.vert_major_ticks, this.w, true);
    this.draw_line_helper(this.horz_major_ticks, this.h, false);
    ctx.stroke();

    ctx.strokeStyle = style_minor_gridline;
    ctx.beginPath();
    this.draw_line_helper(this.vert_minor_ticks, this.w, true);
    this.draw_line_helper(this.horz_minor_ticks, this.h, false);
    ctx.stroke();
  }

// ----------------------------------------------------------------------------
  draw_labels() {
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(1, -1);  // invert the text back after we inverted canvas once for coordinates
    ctx.fillStyle = style_text;
    this.draw_text_helper(this.vert_major_ticks, this.format_vert_label, true,  vtext_offsets);
    this.draw_text_helper(this.horz_major_ticks, this.format_horz_label, false, htext_offsets);
    ctx.restore();
  }

// ----------------------------------------------------------------------------
  draw_charts() {
    const ctx = this.ctx;
    const len = this.opt.data.length;
    const hscale = this.pixel_width;
    const vscale = this.pixel_height;
    const use_smoothing = this.opt["smooth"];

    ctx.strokeStyle = style_chart_stroke;
    ctx.fillStyle = style_chart_fill;
    ctx.moveTo(0, 0);
    ctx.beginPath();
    for (let i = 0; i <= len; i++) {
      let height = this.opt.data[i] * vscale;
/*
  Technically rounding is wrong, but the chart looks better - more crisp - without antialiasing of ANY kind.
  However, charts with consistently small changes, which translate to bar screen height changes of << 1 pixel,
  will visually benefit from vertical aa, so we add it as an extra option. Default is sticking to pixel grid.
*/
      if (use_smoothing !== true) {
        height = Math.round(height);
      }
      ctx.lineTo(hscale * (i  ), height);
      ctx.lineTo(hscale * (i+1), height);
      if (this.opt.data[i] === null) {  // poor choice if large contiguous patches are null; TODO
        ctx.save();
        ctx.fillStyle = style_fail_fill;
        ctx.fillRect(aa_shift + hscale * i, 0, hscale, this.h);  // TODO: remove 1 pixel overlap with next valid datapoint step?
        ctx.restore();
      }
    }
    ctx.lineTo(hscale * len, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();

    ctx.stroke();
    ctx.fill();
  }

// ----------------------------------------------------------------------------
  draw_line_helper(array, line_length, is_vert) {
    const pixel_size = (is_vert ? this.pixel_height : this.pixel_width);

    for (const value of array) {
      const d = Math.round(value * pixel_size);
      const move_pair = [d, 0];
      const line_pair = [d, line_length];
      this.ctx.moveTo(move_pair[+is_vert], move_pair[+!is_vert]);
      this.ctx.lineTo(line_pair[+is_vert], line_pair[+!is_vert]);
    }
  }

// ----------------------------------------------------------------------------
  draw_text_helper(array, fmt_func, is_vert, offsets) {
    const pixel_size = (is_vert ? this.pixel_height : this.pixel_width);

    for (const value of array) {
      const d = Math.round(value * pixel_size);
      const xy_pair = [d, 0];
      this.ctx.fillText(fmt_func.call(this, value), (xy_pair[+is_vert] + offsets[0]), -(xy_pair[+!is_vert] + offsets[1]));  // minus sign because of scale inversion in caller context; todo fix?
    }
  }

// ----------------------------------------------------------------------------

}