var _ = require('lodash');
var ajax = function() {};

var ZenzaWatch = {
  init: {
  }
};

//===BEGIN===


  // api.search.nicovideo.jpを使うためのラッパー関係
  // ここだけフォーマットが独自の文化なので変換してやる
  // invalidなjsonなのにcontent-typeがjsonだったり色々癖が強いが、自由度も高い
  //
  // 参考:
  // http://looooooooop.blog35.fc2.com/blog-entry-1146.html
  // http://toxy.hatenablog.jp/entry/2013/07/25/200645
  // http://ch.nicovideo.jp/pita/blomaga/ar297860
  // http://search.nicovideo.jp/docs/api/ma9.html
  var NicoSearchApiLoader = function() { this.initialize.apply(this, arguments); };
  NicoSearchApiLoader.API_BASE_URL  = 'http://api.search.nicovideo.jp/api/';
  NicoSearchApiLoader.PAGE_BASE_URL = 'http://search.nicovideo.jp/video/';
  NicoSearchApiLoader.SORT = {
      f: 'start_time',
      v: 'view_counter',
      r: 'comment_counter',
      m: 'mylist_counter',
      l: 'length_seconds',
      h: '_hot',    // 人気が高い順
      '_hot':   '_hot',    // 人気が高い順(↑と同じだけど互換用に残ってる)
      '_explore': '_explore', // 新着優先
      '_popular': '_popular', // 並び順指定なし
      '_id': 'id'
    };

  NicoSearchApiLoader.prototype = {
    _u: '',      // 24h, 1w, 1m, ft  期間指定
    _ftfrom: '', // YYYY-MM-DD
    _ftto: '',   // YYYY-MM-DD
    _l: '',      // short long
    _m: false,   // true=音楽ダウンロード
    _sort: '',   // last_comment_time, last_comment_time_asc,
                // view_counter,      view_counter_asc,
                // comment_counter,   comment_counter_asc,
                // mylist_counter,    mylist_counter_asc,
                // upload_time,       upload_time_asc,
                // length_seconds,    length_seconds_asc
    _size: 100, // 一ページの件数  maxは100
    _issuer: 'zenza-watch',
    _base_url: NicoSearchApiLoader.API_BASE_URL,
    initialize: function() {},
    search: function(word, params) {
      return this._search(this.parseParams(word, params));
    },
    parseParams: function(word, params) {
      var query = {filters: []};
        var sortTable = NicoSearchApiLoader.SORT;
        query.query   = word || params.searchWord;
        query.search  = params.searchType === 'tag' ? ['tags_exact'] : ['tags_exact', 'title', 'description'];
        query.sort_by = params.sort && sortTable[params.sort] ? sortTable[params.sort] : 'last_comment_time';
        query.order   = params.order === 'd' ? 'desc' : 'asc';
        query.size    = params.size || 100;
        query.from    = params.page ? Math.max(parseInt(params.page, 10) - 1, 0) * 25 : 0;

      var n = new Date();
      var now = n.getTime();
      switch (params.u) {
        case '1h':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now -   1 *  1 * 60  * 60 * 1000)));
          break;
        case '24h': case '1d':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now -   1 * 24 * 60  * 60 * 1000)));
          break;
        case '1w':  case '7d':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now -   7 * 24 * 60  * 60 * 1000)));
          break;
        case '1m':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now -  30 * 24 * 60  * 60 * 1000)));
          break;
        case '3m':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now -  90 * 24 * 60  * 60 * 1000)));
          break;
        case '6m':
          query.filters.push(this._buildStartTimeRangeFilter(new Date(now - 180 * 24 * 60  * 60 * 1000)));
          break;
        default:
          break;
      }

      if (query.sort_by === '_hot') {
        // 人気が高い順ソート
        (function() {
          var format = function(time) {
            var dt = new Date(time);
            return dt.toLocaleString().replace(/\//g, '-'); //DateFormat.strftime('%Y-%m-%d %H:%M:%S', date);
          };
          query.hot_field = 'mylist_counter';
          query.hot_from = format(new Date(now - 1 * 24 * 60 * 60 * 1000));
          query.hot_to   = format(n);

          query.order = 'desc';
        })();
      }

      if (query.sort_by === 'id') {
        query.sort_by = 'start_time';
        query.order = 'asc';
      }

      if (params.userId && (params.userId + '').match(/^\d+$/)) {
        query.filters.push({type: 'equal', field: 'user_id',    value: params.userId});
      }
      if (params.channelId && (params.channelId + '').match(/^\d+$/)) {
        query.filters.push({type: 'equal', field: 'channel_id', value: params.channelId});
      }
      if (params.commentCount && (params.commentCount + '').match(/^[0-9]+$/)) {
        query.filters.push({
          type: 'range',
          field: 'comment_counter',
          include_lower: true,
          from: params.commentCount
        });
      }

      if (params.l === 'short') { // 5分以内
        query.filters.push(this._buildLengthSecondsRangeFilter(0, 60 * 5));
      } else
      if (params.l === 'long' ) { // 20分以上
        query.filters.push(this._buildLengthSecondsRangeFilter(60 * 20));
      }

      return query;
    },
    toString: function() {
      return JSON.stringify(this.build(this._params));
    },
    _buildStartTimeRangeFilter: function(from, to) {
      var format = function(time) {
        var dt = new Date(time);
        return dt.toLocaleString().replace(/\//g, '-');
      };
      var range = {field: 'start_time',     type: 'range', include_lower: true, };
      range.from = format(from);
      if (to) range.to = format(to);
      return range;
    },
    _buildLengthSecondsRangeFilter: function(from, to) {
      var range = {field: 'length_seconds', type: 'range'};
      if (to) { // xxx ～ xxx
        range.from = Math.min(from, to);
        range.to   = Math.max(from, to);
        range.include_lower = range.include_upper = true;
      } else { // xxx以上
        range.from = from;
        range.include_lower = true;
      }
      return range;
    },
    _search: function(params) {
      var url = this._base_url;
      var data = {};
      data.query   = params.query   || 'ZenzaWatch';
      data.service = params.service || ['video']; // video video_tag
      data.search  = params.search  || ['title', 'tags', 'description'];
      data.join    = params.join    || [
          'cmsid', 'title', 'description', 'thumbnail_url', 'start_time',
          'view_counter', 'comment_counter', 'mylist_counter', 'length_seconds', 'last_res_body'
        //  'user_id', 'channel_id', 'main_community_id', 'ss_adlut'
        ];
      data.filters = params.filters || [{}];
      data.sort_by = params.sort_by || 'start_time';
      data.order   = params.order   || 'desc';
      data.timeout = params.timeout || 10000;
      data.issuer  = params.issuer  || 'zenza-watch';
      data.reason  = params.reason  || 'zenza-watch'; // 'watchItLater';
      data.size    = params.size    || 100;
      data.from    = params.from    || 0;

      if (params.sort_by === '_hot') { // 人気順ソートのパラメータ
        data.hot_field = params.hot_field;
        data.hot_from  = params.hot_from;
        data.hot_to    = params.hot_to;
      }

      return new Promise(function(resolve, reject) {
        ajax({
          url: url,
          type: 'POST',
          data: JSON.stringify(data),
          timeout: 30000
        }).then(function(result) {
          console.log('search result: ', result);
          if (result.status !== 200) {
            return reject({status: 'fail', code: result.status, description: 'network fail'});
          }
          var data = this.parseJsonModoki(result.responseText);

          if (!data) {
            return reject({status: 'fail', description: 'json parse fail'});
          }

          return resolve(this.convertResultFormat(data, params));
        }.bind(this),
        function(result) {
          // 検索APIはContent-Type: application/jsonなのに
          // invalidなjsonが返るせいでrejectルートに進む きもい
          
          if (result.status !== 200) {
            window.console.log('%c ajax error: ' + status, 'background: red', arguments);
            return reject({status: 'fail', code: result.status, description: 'network fail'});
          }

          var data = this.parseJsonModoki(result.responseText);

          if (!data) {
            return reject({status: 'fail', description: 'json parse fail'});
          }

          return resolve(this.convertResultFormat(data, params));
        }.bind(this));
      }.bind(this));
    },
    /**
     * 検索APIが返すjsonもどきをパースする
     */
    parseJsonModoki: function(str) {
      var data;
      try {
        var lines = str.split('\n'), head = JSON.parse(lines[0]);
        if (head.values[0].total > 0) {
          data = [head];
          for (var i = 1, len = lines.length; i < len - 1; i++) {
            data.push(JSON.parse(lines[i]));
          }
        } else {
          data = [head, JSON.parse(lines[1]), {type: 'hits', values: []}, JSON.parse(lines[2])];
        }
      } catch(e) {
        window.console.log('Exception: ', e, str);
        return null;
      }
      return data;
    },
    /**
     * 検索APIが返す謎resultを他のAPI形式に変換する
     */
    convertResultFormat: function(result, params) {
      var searchResult;
        searchResult = {
          status: 'ok',
          count: result[0].values[0].total,
          list: []
        };
        var pushItems = function(items) {
          var len = items.length;
          for (var i = 0; i < len; i++) {
            var item = items[i], description = item.description ? item.description.replace(/<.*?>/g, '') : '';

            item.id = item.cmsid;
            if (item.thumbnail_url.indexOf('.M') >= 0) {
              item.thumbnail_url = item.thumbnail_url.replace(/\.M$/, '');
              item.is_middle_thumbnail = true;
            } else
            if (item.thumbnail_url.indexOf('.M') < 0 &&
                item.id.indexOf('sm') === 0) {
              var threshold = 23608629, // .Mのついた最小ID?
                  _id = _.parseInt(item.id.substr(2));
              if (_id >= threshold) {
                item.is_middle_thumbnail = true;
              }
            }

            searchResult.list.push({
              id:                item.cmsid,
              type:              0, // 0 = VIDEO,
              length:            item.length_seconds ?
                                   Math.floor(item.length_seconds / 60) + ':' + (item.length_seconds % 60 + 100).toString().substr(1) : '',
              mylist_counter:    item.mylist_counter,
              view_counter:      item.view_counter,
              num_res:           item.comment_counter,
              first_retrieve:    item.start_time,
              create_time:       item.start_time,
              thumbnail_url:     item.thumbnail_url,
              title:             item.title,
              description_short: description.substr(0, 150),
              description_full:  description,
              length_seconds:    item.length_seconds,
              last_res_body:     item.last_res_body,
              is_middle_thumbnail: item.is_middle_thumbnail
  //            channel_id:        item.channel_id,
  //            main_community_id: item.main_community_id
            });
          }
          if (params.sort === '_id') {
            searchResult.list = searchResult.list.sort(function(a, b){return a.id > b.id ? 1 : -1;});
          }
          // 投稿日時順ソートの時、投稿日時が同一だったら動画IDでソートする(公式銀魂のための対応)
          if (params.sort === 'f') {
            var aid = params.order === 'a' ? 1 : -1;
            searchResult.list = searchResult.list.sort(function(a, b){
              if (a.first_retrieve !== b.first_retrieve) {
                return a.first_retrieve > b.first_retrieve ? aid : -aid;
              }
              return a.id > b.id ? aid : -aid;
            });
          }
        };
        for (var i = 1; i < result.length; i++) {
          if (result[i].type === 'hits' && result[i].endofstream) { break; }
          if (result[i].type === 'hits' && result[i].values) {
            pushItems(result[i].values);
          }
        }
      return searchResult;
    }
  };
  ZenzaWatch.init.nicoSearchApiLoader = new NicoSearchApiLoader();



//===END===

module.exports = {
  NicoSearchApiLoader: NicoSearchApiLoader
};

/*
http://www.nicovideo.jp/watch/sm29156077?playlist_type=tag&tag=VOCALOID&sort=f&order=d&page=1&continuous=1
http://www.nicovideo.jp/watch/sm29152556?playlist_type=tag&tag=VOCALOID&sort=f&order=d&page=1&continuous=1

http://www.nicovideo.jp/watch/so29183254?playlist_type=search&keyword=%E7%A5%9E%E5%9B%9E&sort=f&order=d&page=1&continuous=1
*/
