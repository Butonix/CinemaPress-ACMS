'use strict';

/**
 * Configuration dependencies.
 */

var config  = require('../config/production/config');
var modules = require('../config/production/modules');

/**
 * Node dependencies.
 */

var async   = require('async');
var request = require('request');
var express = require('express');
var router  = express.Router();

/**
 * Player.
 */

router.get('/?', function(req, res) {

    var id            = (parseInt(req.query.id))         ? parseInt(req.query.id)            : 0;
    var season        = (parseInt(req.query.season))     ? parseInt(req.query.season)        : 0;
    var episode       = (parseInt(req.query.episode))    ? parseInt(req.query.episode)       : 0;
    var translate     = (parseInt(req.query.translate))  ? parseInt(req.query.translate)     : null;
    var start_time    = (parseInt(req.query.start_time)) ? parseInt(req.query.start_time)    : 0;
    var start_episode = (req.query.start_episode)        ? req.query.start_episode           : '';

    var script = 'function player(){var a=document.querySelector("#yohoho");if(!a)return!1;var b,c,d;b=document.createElement("iframe"),b.setAttribute("id","player-iframe"),b.setAttribute("frameborder","0"),b.setAttribute("allowfullscreen","allowfullscreen"),b.setAttribute("src","iframe-src"),a.appendChild(b),c=parseInt(a.offsetWidth)?parseInt(a.offsetWidth):parseInt(a.parentNode.offsetWidth)?a.parentNode.offsetWidth:610,d=parseInt(a.offsetHeight)&&c/3<parseInt(a.offsetHeight)?parseInt(a.offsetHeight):parseInt(a.parentNode.offsetHeight)&&c/3<parseInt(a.parentNode.offsetHeight)?parseInt(a.parentNode.offsetHeight):c/2;var e="width:"+c+"px;height:"+d+"px";b.setAttribute("style",e),b.setAttribute("width",c),b.setAttribute("height",d),a.setAttribute("style",e)}document.addEventListener("DOMContentLoaded",player);document.addEventListener("DOMContentLoaded",function(){var t=document.querySelector("#player-translate");var it="iframe-translate";if(t&&it&&it!=="iframe"+"-"+"translate"){t.innerHTML=it;}var q=document.querySelector("#player-quality");var iq="iframe-quality";if(q&&iq&&iq!=="iframe"+"-"+"quality"){q.innerHTML=iq;}});';

    if (req.query.player) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.send(script.replace('iframe-src', decodeURIComponent(req.query.player)));
    }

    if (!/googlebot|crawler|spider|robot|crawling|bot/i.test(req.get('User-Agent'))) {

        async.parallel({
                "moonwalk": function (callback) {
                    if (modules.player.data.moonwalk.token) {
                        getMoonwalk(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "hdgo": function (callback) {
                    if (modules.player.data.hdgo.token) {
                        getHdgo(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "iframe": function (callback) {
                    if (modules.player.data.iframe.show) {
                        getIframe(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "kodik": function (callback) {
                    if (modules.player.data.kodik.show) {
                        getKodik(function(result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                },
                "yohoho": function (callback) {
                    if (modules.player.data.yohoho.player) {
                        getYohoho(function (result) {
                            callback(null, result);
                        });
                    }
                    else {
                        callback(null, {});
                    }
                }
            },
            function(err, result) {

                if (err) {
                    return res.send(err);
                }

                if (modules.episode.status && season && result['moonwalk'].src) {
                    script = script
                        .replace('iframe-src', result['moonwalk'].src)
                        .replace('iframe-translate', result['moonwalk'].translate.toUpperCase())
                        .replace('iframe-quality', result['moonwalk'].quality.toUpperCase());
                }
                else if (result[modules.player.data.display].src) {
                    if (modules.player.data.display === 'yohoho') {
                        script = result['yohoho'].src;
                    }
                    else {
                        script = script
                            .replace('iframe-src', result[modules.player.data.display].src)
                            .replace('iframe-translate', result[modules.player.data.display].translate.toUpperCase())
                            .replace('iframe-quality', result[modules.player.data.display].quality.toUpperCase());
                    }
                }
                else if (result['moonwalk'].src) {
                    script = script
                        .replace('iframe-src', result['moonwalk'].src)
                        .replace('iframe-translate', result['moonwalk'].translate.toUpperCase())
                        .replace('iframe-quality', result['moonwalk'].quality.toUpperCase());
                }
                else if (result['hdgo'].src) {
                    script = script
                        .replace('iframe-src', result['hdgo'].src)
                        .replace('iframe-translate', result['hdgo'].translate.toUpperCase())
                        .replace('iframe-quality', result['hdgo'].quality.toUpperCase());
                }
                else if (result['iframe'].src) {
                    script = script
                        .replace('iframe-src', result['iframe'].src)
                        .replace('iframe-translate', result['iframe'].translate.toUpperCase())
                        .replace('iframe-quality', result['iframe'].quality.toUpperCase());
                }
                else if (result['kodik'].src) {
                    script = script
                        .replace('iframe-src', result['kodik'].src)
                        .replace('iframe-translate', result['kodik'].translate.toUpperCase())
                        .replace('iframe-quality', result['kodik'].quality.toUpperCase());
                }
                else if (result['yohoho'].src) {
                    script = result['yohoho'].src;
                }
                else {
                    script = '';
                }

                res.setHeader('Content-Type', 'application/javascript');
                res.send(script);

            });

    }
    else {

        res.setHeader('Content-Type', 'application/javascript');
        res.send('console.log(\'Hello CinemaPress!\');');

    }

    /**
     * Get Moonwalk player.
     */

    function getMoonwalk(callback) {

        api('http://moonwalk.cc/api/videos.json?' +
            'api_token=' + modules.player.data.moonwalk.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && !json.error && json.length) {
                    var iframe_url = '';
                    var added = 0;
                    for (var i = 0; i < json.length; i++) {
                        if (season && episode && translate === json[i].translator_id) {
                            iframe_url = getMoonlight(json[i].iframe_url) + '?season=' + season + '&episode=' + episode;
                            iframe_translate = json[i].translator ? json[i].translator : '';
                            iframe_quality = json[i].source_type ? json[i].source_type : '';
                            break;
                        }
                        else {
                            var d = json[i].added_at || json[i].last_episode_time || 0;
                            var publish = (new Date(d).getTime()/1000);
                            if (publish >= added) {
                                iframe_url = getMoonlight(json[i].iframe_url);
                                iframe_translate = json[i].translator ? json[i].translator : '';
                                iframe_quality = json[i].source_type ? json[i].source_type : '';
                                added = publish;
                            }
                        }
                    }
                    if (iframe_url && start_episode) {
                        var se = start_episode.match(/^([a-z0-9]*?)\|([0-9]*?)\|([0-9]*?)$/i);
                        if (se && se.length === 4) {
                            iframe_url = iframe_url.replace(/serial\/([a-z0-9]*?)\//i, 'serial/' + se[1] + '/');
                            if (iframe_url.indexOf('?')+1) {
                                iframe_url = iframe_url + '&season=' + se[2] + '&episode=' + se[3]
                            }
                            else {
                                iframe_url = iframe_url + '?season=' + se[2] + '&episode=' + se[3]
                            }
                        }
                    }
                    if (iframe_url && start_time) {
                        if (iframe_url.indexOf('?')+1) {
                            iframe_url = iframe_url + '&start_time=' + start_time
                        }
                        else {
                            iframe_url = iframe_url + '?start_time=' + start_time
                        }
                    }
                    iframe_src = iframe_url;
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

        function getMoonlight(iframe_url) {
            var pat = /\/[a-z]{1,20}\/[a-z0-9]{1,40}\/iframe/i;
            var str = pat.exec(iframe_url);
            if (str && str[0]) {
                if (modules.player.data.moonlight.domain) {
                    var domain = modules.player.data.moonlight.domain;
                    domain = (domain[domain.length-1] === '/')
                        ? domain.slice(0, -1)
                        : domain;
                    domain = (domain.indexOf('://') === -1)
                        ? config.protocol + domain
                        : domain;
                    iframe_url = domain + str[0];
                }
                else {
                    iframe_url = 'https://streamguard.cc' + str[0];
                }
            }
            return iframe_url;
        }

    }

    /**
     * Get HDGO player.
     */

    function getHdgo(callback) {

        api('http://hdgo.cc/api/video.json?' +
            'token=' + modules.player.data.hdgo.token.trim() + '&' +
            'kinopoisk_id=' + id,
            function (json) {
                var iframe_src = '';
                var iframe_translate = '';
                var iframe_quality = '';
                if (json && !json.error && json.length && json[0].iframe_url) {
                    iframe_src = json[0].iframe_url.replace('.cc', '.cx').replace('http:', 'https:');
                    iframe_translate = json[0].translator ? json[0].translator : '';
                    iframe_quality = json[0].quality ? json[0].quality : '';
                }
                callback({
                    "src": iframe_src,
                    "translate": iframe_translate,
                    "quality": iframe_quality
                });
            });

    }

    /**
     * Get Iframe player.
     */

    function getIframe(callback) {

        var iframe_src = '';
        var iframe_translate = '';
        var iframe_quality = '';
        async.waterfall([
            function(callback) {
                api('http://iframe.video/api/v1/movies/&' +
                    'kp_id=' + id,
                    function (json) {
                        if (json && json.total && parseInt(json.total) && json.results) {
                            var key = Object.keys(json.results)[0];
                            if (parseInt(json.results[key].kp_id) === id) {
                                iframe_src = json.results[key].path;
                                var media = (json.results[key].media)
                                    ? json.results[key].media[Object.keys(json.results[key].media)[Object.keys(json.results[key].media).length-1]]
                                    : {};
                                iframe_translate = media.translation ? media.translation : '';
                                iframe_quality = media.source ? media.source : '';
                            }
                        }
                        callback(null, {
                            "src": iframe_src,
                            "translate": iframe_translate,
                            "quality": iframe_quality
                        });
                    });
            },
            function(iframe, callback) {
                if (iframe.src) {
                    return callback(null, iframe);
                }
                api('http://iframe.video/api/v1/tv-series/&' +
                    'kp_id=' + id,
                    function (json) {
                        if (json && json.total && parseInt(json.total) && json.results) {
                            var key = Object.keys(json.results)[0];
                            if (parseInt(json.results[key].kp_id) === id) {
                                iframe_src = json.results[key].path;
                                var media = (json.results[key].media)
                                    ? json.results[key].media[Object.keys(json.results[key].media)[Object.keys(json.results[key].media).length-1]]
                                    : {};
                                iframe_translate = media.translation ? media.translation : '';
                                iframe_quality = media.source ? media.source : '';
                            }
                        }
                        callback(null, {
                            "src": iframe_src,
                            "translate": iframe_translate,
                            "quality": iframe_quality
                        });
                    });
            },
            function(iframe, callback) {
                if (iframe.src) {
                    return callback(null, iframe);
                }
                api('http://iframe.video/api/v1/tv/&' +
                    'kp_id=' + id,
                    function (json) {
                        if (json && json.total && parseInt(json.total) && json.results) {
                            var key = Object.keys(json.results)[0];
                            if (parseInt(json.results[key].kp_id) === id) {
                                iframe_src = json.results[key].path;
                                var media = (json.results[key].media)
                                    ? json.results[key].media[Object.keys(json.results[key].media)[Object.keys(json.results[key].media).length-1]]
                                    : {};
                                iframe_translate = media.translation ? media.translation : '';
                                iframe_quality = media.source ? media.source : '';
                            }
                        }
                        callback(null, {
                            "src": iframe_src,
                            "translate": iframe_translate,
                            "quality": iframe_quality
                        });
                    });
            }
        ], function (err, result) {
            callback(result);
        });

    }

    /**
     * Get Kodik player.
     */

    function getKodik(callback) {

        api('http://kodik.cc/api.js?' +
            'kp_id=' + id,
            function (json, body) {
                var iframe_src = '';
                var matches = /(\/\/kodik\.cc\/[a-z]{1,10}\/[0-9]{1,7}\/[a-z0-9]{5,50}\/[a-z0-9]{1,10})/i.exec(body);
                if (matches && matches[1]) {
                    iframe_src = matches[1];
                }
                callback({
                    "src": iframe_src,
                    "translate": "",
                    "quality": ""
                });
            });

    }

    /**
     * Get Yohoho player.
     */

    function getYohoho(callback) {

        api('https://yohoho.cc/yo.js',
            function (json, body) {
                callback({
                    "src": body,
                    "translate": "",
                    "quality": ""
                });
            });

    }

    /**
     * Request.
     */

    function api(url, callback) {
        request({url: url, timeout: 1500, agent: false, pool: {maxSockets: 100}}, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var json = tryParseJSON(body);
                callback(json, body);
            }
            else {
                console.log(error);
                callback(null, '');
            }
        });
    }

    /**
     * Valid JSON.
     *
     * @param {String} jsonString
     */

    function tryParseJSON(jsonString) {
        try {
            var o = JSON.parse(jsonString);
            if (o && typeof o === "object") {
                return o;
            }
        }
        catch (e) { }
        return null;
    }

});

module.exports = router;