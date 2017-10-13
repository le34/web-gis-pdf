var express = require('express');
var request = require('request');
var sharp = require('sharp');
var fs = require('fs');
var path = require('path');
var PDFDocument = require('pdfkit');
var mbgl = require('@mapbox/mapbox-gl-native');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var process = require('process');
var host = 'localhost:8080';

if (process.env.NODE_ENV === 'production') {
    host = 'tiles';
}
mbgl.on('message', function (msg) {
    console.log('mapbox-log:', msg);
});
app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(express.static('geojson'))
var render = function(map, res, req, options, bufferLast) {
    map.render(options, function (err, buffer) {
        console.log('render')
        if (!bufferLast.equals(buffer)) {
            render(map, res, req, options, buffer)
        } else {
            map.release();
            image = sharp(buffer, {
                raw: {
                    width: options.width * req.body.ratio,
                    height: options.height * req.body.ratio,
                    channels: 4
                }
            });
            image.png({ adaptiveFiltering: false }).toBuffer().then(function (buffer) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    var doc = new PDFDocument({
                        size: 'A4'
                    });
                    var buf = Buffer.from(buffer);
                    //doc.text('Hello world!');
                    var width = 21 // cm
                    var margin = 0 // cm
                    doc.image(buf, margin * 72 / 2.54, margin * 72 / 2.54, { width: width * 72 / 2.54 });
                    doc.pipe(res);
                    doc.end();
                    res.type('pdf');
                }
            });
        }            
    });
};
app.post('/', function (req, res, next) {
    var options = req.body.options;
    // options.zoom = options.zoom + 1;
    options.height = parseInt((297 / 210) * options.width);
    var style = req.body.style;
    for (var key in style.sources) {
        if (style.sources[key].type === 'raster') {
            style.sources[key].tileSize /= req.body.ratio
        }
    }
    console.log(options);
    var mapOptions = {
        request: function (req, callback) {
            /*
            if (req.url.indexOf('.geojson') !== -1) {
                console.log('file', req);
                fs.readFile(path.join(__dirname, 'geojson', req.url), function(err, data) {
                    callback(err, { data: data });
                })
            }*/
            /*
            else if (req.url.indexOf('/api/data') !== -1) {
                console.log('geojson', req.url);
                request.get({
                    url: 'http://localhost:3000' + req.url,
                    encoding: null,
                    gzip: true
                }, function (err, res, body) {
                    if (err) {
                        callback(err);
                    }
                    callback(null, { data: body });
                })
            } else {
            */
            const i = req.url.indexOf('/api/tileserver');
            if (i !== -1) {
                req.url = 'http://' + host + req.url.substring(i + 15);
            }
            console.log(req.url);
            request({
                url: req.url,
                encoding: null,
                gzip: true
            }, function (err, res, body) {
                if (err) {
                    console.log('error', url);
                    // callback(err);
                    callback(null, {data: new Buffer(0)});
                } else if (res.statusCode === 200) {
                    var response = {};

                    if (res.headers.modified) {
                        response.modified = new Date(res.headers.modified);
                        // console.log('modified');
                    };
                    if (res.headers.expires) {
                        response.expires = new Date(res.headers.expires);
                        // console.log('expires');
                    };
                    if (res.headers.etag) {
                        response.etag = res.headers.etag;
                        // console.log('etag', res.headers.etag);
                    };
                    response.data = body;
                    callback(null, response);
                } else {
                    console.log('url', req.url);
                    //console.log(err, res.statusCode, body)
                    //callback(new Error(JSON.parse(body).message));
                    //callback(new Error(res.statusCode));
                    callback(null, {data: new Buffer(0)});
                }
            })            
        },
        ratio: req.body.ratio
    }
    var map = new mbgl.Map(mapOptions);
    map.load(style);
    render(map, res, req, options, new Buffer(0))
    //map.render(options, function (err, buffer) {
        /*
        var image = sharp(buffer, {
            raw: {
                width: options.width * req.body.ratio,
                height: options.height * req.body.ratio,
                channels: 4
            }
        });
        image.png({ adaptiveFiltering: false }).toFile('out1.png');
        */
        /*        map.release();
                map = new mbgl.Map(mapOptions);
                map.load(style);*/
/*
        map.render(options, function (err, buffer) {
            if (err) throw err;
            // map.release()
            image = sharp(buffer, {
                raw: {
                    width: options.width * req.body.ratio,
                    height: options.height * req.body.ratio,
                    channels: 4
                }
            });
            image.png({ adaptiveFiltering: false }).toBuffer().then(function (buffer) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    var doc = new PDFDocument({
                        size: 'A4'
                    });
                    var buf = Buffer.from(buffer);
                    //doc.text('Hello world!');
                    var width = 21 // cm
                    var margin = 0 // cm
                    doc.image(buf, margin * 72 / 2.54, margin * 72 / 2.54, { width: width * 72 / 2.54 });
                    doc.pipe(res);
                    doc.end();
                    res.type('pdf');
                }
            });
            //image.toFile('out3.png');
        });

    });*/
});

app.listen(4040, '0.0.0.0', function () {
    console.log('Example app listening on port 4040!');
});
