'use strict';

const offset_down = 20;
const offset_left = 30;
const offset_up   = 15;
const offset_right= 20;

const minor_count = 4;  // vertical; todo remove
const major_length = 3;  // change lengths to 3.5 for slightly more prominent ticks
const minor_length = 3;

// TODO: read font metrics instead
const vtext_hoffset = -14;
const vtext_voffset = 3;
const htext_voffset = 12;

const aa_shift = 0.5;

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

const ms_in_sec = 1000;
const sec_in_hour = 3600;
const hour_in_day = 24;
const sec_in_day = sec_in_hour*hour_in_day;
const days_in_week = 7;

const style_major_gridline = "rgba(0, 0, 0, 0.125)";  // transparent black == grey
const style_axis = "black";
const style_tick = "black";
const style_chart_stroke = "black";
const style_chart_fill = "rgba(128, 255, 0, 0.2)";  // transparent green
const style_fail_fill = "rgba(255, 0, 0, 0.2)";  // transparent red

class femtochart {
  constructor() {
    //console.log( arguments );
    this.canvas = arguments[0];
    this.opt = arguments[1];

    this.ctx = this.canvas.getContext('2d');

    this.init();
    this.fix_collection_fails(this.opt.data, "mask", [110,401,402,507]);  // TODO: load dates from external file and convert them to indices
    this.draw_axes();
    this.draw_ticks();
    //this.draw_grid();
    this.draw_labels();
    this.draw_charts();
  }

// ----------------------------------------------------------------------------
  init() {
    this.true_length = this.opt.data.length;
    this.pixel_width = 2;  // TODO: maybe let user set instead?
    this.canvas.height = vh*0.48;  // TODO: fill most of the screen
    this.canvas.width = this.true_length*this.pixel_width + offset_left + offset_right;  // this is non-negotiable, sorry
    this.pixel_height = (this.canvas.height - offset_up - offset_down)/this.round_max(this.opt.data);

    // flip upside down to normal x-y axes orientation and offset by 0.5 to avoid antialias on integer values
    this.ctx.setTransform(1, 0, 0, -1, aa_shift, this.canvas.height - aa_shift);  // horz scale, horz skew, vert skew, vert scale, horz move, vert move

    // set line dash offset to avoid antialias on dash line ends too
    this.ctx.lineDashOffset = aa_shift;
    //this.ctx.setLineDash([3, 3]);

    this.ctx.translate(offset_left, offset_down);
    this.ctx.textAlign = 'center';

    this.w = this.canvas.width - offset_left - offset_right;
    this.h = this.canvas.height - offset_up - offset_down;

    this.date_fmt = new Intl.DateTimeFormat('default', { year: '2-digit', month: 'short' } );
    this.time_fmt = new Intl.DateTimeFormat('default', { hour12: false, hour: '2-digit', minute: '2-digit' } );
  }

// ----------------------------------------------------------------------------
  round_max(data) {
    const exact_max = Math.max(...data);  // TODO: bench spread perf

    // TODO: dont set these as a side-effect
    this.htick_size = Math.pow(10, Math.floor(Math.log10(exact_max)));
    this.major_count = Math.ceil(exact_max/this.htick_size);

    if (this.major_count <= 4) {  // todo remove
      this.htick_size /= 2;
      this.major_count *= 2;
    }

    // TODO: use min_major and max_major settings to control subdivisions
    // alternatively, use min_used_fraction setting to control it (minimum of max_data_value / max_possible_value)

    return (this.major_count * this.htick_size);
  }

// ----------------------------------------------------------------------------
  num_format(num) {
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
  format_xtext(i, opt) {  // format x-axis major tick label text
    const ts = opt.time_step;
    const date = this.index_to_date(i, opt);
    if (ts == sec_in_day) {
      return this.date_fmt.format(date);
    } else {  // always, really? todo
      return this.time_fmt.format(date);
    }
  }

  index_to_date(index, opt) {
    return new Date(ms_in_sec*(opt.start_time + index*opt.time_step));
  }

  date_diff_days(start, end) {
    return (end-start)/ms_in_sec/sec_in_day;
  }
// ----------------------------------------------------------------------------
  horz_ticks(opt) {  // returns an array of indices for horizontal ticks based on input data/options
    let [major, minor] = [[], []];
    let x;
    const len = opt.data.length;
    const ts = opt.time_step;
    const minor_width = 900;  // 15-minute minor ticks for intraday charts
    const weekday_offset = this.index_to_date(0, this.opt).getDay();
    if (ts == sec_in_day) {
      this.push_helper(major, len, this.days_to_next_month);  // monthly majors
      this.push_helper(minor, len, days_in_week, weekday_offset);  // weekly minors
    } else {
      this.push_helper(major, sec_in_day / ts, sec_in_hour / ts);  // hourly majors
      this.push_helper(minor, sec_in_day / ts, minor_width / ts);  // choose 10 or 15 minutes for minors?
    }
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
      if (is_func) {  // I don't like this
        x = next(x, this);
      } else {
        x += next;
      }
    }
  }

  days_to_next_month(index, t) {
    let start = t.index_to_date(index, t.opt);
    let end = new Date(start);
    end.setMonth(start.getMonth() + 1, 1);
    return index + t.date_diff_days(start, end);
  }
// ----------------------------------------------------------------------------
  fix_collection_fails(array, fix_option, indices) {  // fix data collection failures
    switch (fix_option) {
      case "mask":  // linear interpolation
        // extrapolation could quickly result in weird values, so we deliberately skip doing it
        for (let ind of indices) {
          array[ind] = (array[ind-1] + array[ind+1])/2;  // TODO: multiple adjacent indices, first and last indices
        }
        break;
      case "leave": // leave as-is
        break;
      case "remove":  // remove entirely
        for (let ind of indices) {
          array[ind] = null;
        }
        break;
      default:  // unknown option
        break;
    }
  }

// ----------------------------------------------------------------------------
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
  draw_ticks() {  // TODO: refactor
    const ctx = this.ctx;
    let x, i;

    ctx.strokeStyle = style_tick;
    ctx.beginPath();

    // Vertical major ticks
    for (let i = 0; i <= this.major_count; i++) {
      const y = Math.round(this.h*i/this.major_count);
      ctx.moveTo(            0, y);
      ctx.lineTo(-major_length, y);
    }

    // Vertical minor ticks
    for (let i = 0; i <= this.major_count*minor_count; i++) {
      const y = Math.round(this.h*i/this.major_count/minor_count);
      ctx.moveTo(           0, y);
      ctx.lineTo(minor_length, y);
    }

/*    // Vertical text
    ctx.save();
    ctx.scale(1, -1);  // invert the text back after we inverted canvas once for coordinates
    for (let i = 0; i <= this.major_count; i++) {
      const y = Math.round(this.h*i/this.major_count);
      ctx.fillText(this.num_format(i*this.htick_size), vtext_hoffset, -y + vtext_voffset);
    }
    ctx.restore();*/

    const [major_ticks, minor_ticks] = this.horz_ticks(this.opt);

    // Horizontal major ticks
    //i = 0;
    for (i of major_ticks) {
      x = i * this.pixel_width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, -major_length);
    }

    // Horizontal minor ticks
    //i = 0;
    for (i of minor_ticks) {
      x = i * this.pixel_width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, minor_length);
    }

    ctx.stroke();
//  }
// ----------------------------------------------------------------------------
//  draw_grid() {  // TODO: merge with ticks?
//    const ctx = this.ctx;
//    let x, i;

    ctx.strokeStyle = style_major_gridline;
    ctx.beginPath();
    // Horizontal gridlines
    for (let i = 0; i <= this.major_count; i++) {
      const y = Math.round(i*this.h/this.major_count);
      ctx.moveTo(0,      y);
      ctx.lineTo(this.w, y);

      ctx.save();
      ctx.scale(1, -1);  // invert the text back after we inverted canvas once for coordinates
      ctx.fillText(this.num_format(i*this.htick_size), vtext_hoffset, -y + vtext_voffset);
      ctx.restore();
    }
/* minor horizontal gridlines
    for (let i = 0; i < major_count*minor_count; i++) {
      const y = Math.round(this.h*(i+1)/major_count/minor_count);
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
    }*/

    ctx.save();
    ctx.scale(1, -1);  // invert the text back after we inverted canvas once for coordinates
    // Vertical gridlines
    i = 0;
    for (i of major_ticks) {
      x = i * this.pixel_width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, -this.h);
      ctx.fillText(this.format_xtext(i, this.opt), x, htext_voffset);
    }

    ctx.stroke();
    ctx.restore();
  }

// ----------------------------------------------------------------------------
  draw_labels() {

  }

// ----------------------------------------------------------------------------
  draw_charts() {
    const ctx = this.ctx;

    const len = this.opt.data.length;

    const hscale = this.pixel_width;
    const vscale = this.pixel_height;

    let offset = 0;
    ctx.moveTo(0, 0);
    ctx.beginPath();
    for (let i = 0; i <= len; i++) {
      const height = Math.round(this.opt.data[i]*vscale);  // technically rounding is wrong, but the chart looks better - more crisp - without antialiasing of ANY kind
      ctx.lineTo(hscale*(i  ), height);
      ctx.lineTo(hscale*(i+1), height);
      if (this.opt.data[i] === null) {  // poor choice if large contiguous patches are null
        ctx.save();
        ctx.fillStyle = style_fail_fill;
        ctx.fillRect(aa_shift + hscale*(i), 0, hscale, this.h);  // TODO: remove 1 pixel overlap with next valid datapoint step?
        ctx.restore();
      }
    }
    ctx.lineTo(hscale*len, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();

    ctx.strokeStyle = style_chart_stroke;
    ctx.fillStyle = style_chart_fill;

    ctx.stroke();
    ctx.fill();
  }

}
