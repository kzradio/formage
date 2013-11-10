'use strict';
/*global makeRes */
describe("high level REST requests on mongoose", function () {
    var ctx = {};
    before(function (done) {
        _.each(require.cache, function (mod, modName) {
            if (~modName.indexOf('formage') || ~modName.indexOf('mongoose') || ~modName.indexOf('jugglingdb'))
                delete require.cache[modName];
        });
        var formage = require('../index');
        var mongoose = ctx.mongoose = require("mongoose");
        var conn_str = 'mongodb://localhost/formage-test' + this.test.parent.title.replace(/\s/g, '');
        mongoose.connect(conn_str, function (err) {
            if (err) return done(err);
            return mongoose.connection.db.dropDatabase(function (err) {
                var AppliesTo = mongoose.model('AppliesTo', new mongoose.Schema({
                    Title: {type: String, limit: 100, required: true},
                    Identifier: {type: String, limit: 100},
                    Editable: {type: Number}
                }));
                var tests = require('../example/classic/models/tests');
                var pages = require('../example/classic/models/pages');
                var config = require('../example/classic/models/config');
                var express = require('express');
                var app = express();
                formage.init(app, express, {pages: pages, AppliesTo: AppliesTo, Tests: tests, config: config}, {
                    title: 'Formage Example',
                    default_section: 'Main',
                    admin_users_gui: true
                });
                ctx.app = mock_req_proto.app = app.admin_app;
                done(err);
            })
        });
    });

    function step1(done) {
        var mock_req = _.defaults({
            url: "/model/config/document/single",
            method: "POST",
            body: {
                title: 'ref1',
                'footer.links_li0_text': 'tgf2',
                'footer.links_li0_url': 'yhg2'
            }
        }, mock_req_proto);
        var mock_res = _.defaults({ req: mock_req }, mock_res_proto);
        mock_res.render = function (view, options) {
            done(options.form.errors);
        };
        mock_res.redirect = function (url) {
            url.should.equal("/admin/model/config");
            step2(done);
        };
        ctx.app.handle(mock_req, mock_res);
    }

    function step2(done) {
        var mock_req = _.defaults({
            url: "/model/config/document/single",
            method: "GET"
        }, mock_req_proto);

        var mock_res = _.defaults({ req: mock_req }, mock_res_proto);

        mock_res.render = function (view, options) {
            view.should.equal("document.jade");
            should.exist(options);
            options.form.fields["footer.links"].fields.text.value.should.eqaul("tgf2");
            options.form.fields["footer.links"].fields.url.value.should.equal("yhg2");
            this.req.app.render(view, options, function (err, doc) {
                if (err) throw err;
                should.exist(doc);
                Boolean(~doc.indexOf(' value="tgf2" class="optional" type="text" name="footer.links_li0_text"'))
                    .should.equal(true);
                step3(done);
            });
        };
        ctx.app.handle(mock_req, mock_res);
    }

    function step3(done) {
        var mock_req = _.defaults({
            url: "/model/config/document/single",
            method: "POST",
            body: {'footer.links_li0_text': ''}
        }, mock_req_proto);
        var mock_res = _.defaults({ req: mock_req }, mock_res_proto);
        mock_res.render = function (view, options) {
            done(options.form.errors);
        };
        mock_res.redirect = function (url) {
            url.should.equal("/admin/model/config");
            step4(done);
        };

        ctx.app.handle(mock_req, mock_res);
    }

    function step4(done) {
        var mock_req = _.defaults({
            url: "/model/config/document/single",
            method: "GET"
        }, mock_req_proto);

        var mock_res = _.defaults({ req: mock_req }, mock_res_proto);

        mock_res.render = function (view, options) {
            view.should.equal("document.jade");
            should.exist(options);
            this.req.app.render(view, options, function (err, doc) {
                if (err) throw err;
                should.exist(doc);
                Boolean(~doc.indexOf(' value="" class="optional" type="text" name="footer.links_li0_text"'))
                    .should.equal(true);
                return done();
            });
        };
        ctx.app.handle(mock_req, mock_res);
    }

    it.only("post", function (done) {
        var mock_req = _.defaults({
            url: "/model/Tests/document/new",
            method: "POST",
            headers: {},
            body: {
                string_req: "gaga",
                num_with_params: "0",
                enum: "",
                'list_o_numbers_li0___self__': "0",
                'list_o_numbers_li1___self__': "1",
                'list_o_numbers_li2___self__': "2",
                'list_li0_name': 'ggg',
                'list_li0_list_li0_name': 'hhh',
                'list_li0_list_li1_name': 'jjj',
                'object.object.object.nested_string_req': "gigi"
            }
        }, mock_req_proto);
        var mock_res = makeRes(mock_req, done);

        mock_res.redirect = function (url) {
            var doc = this._debug_document;
            Number(0).should.equal(url.indexOf("/admin/model/Test"));
            var mock_req = _.defaults({
                url: '/model/Tests/document/' + doc.id,
                method: "GET"
            }, mock_req_proto);

            var mock_res = makeRes(mock_req, done);

            mock_res.render = function (view, options) {
                view.should.equal("document.jade");
                should.exist(options);

                var instance = options.form.instance;
                instance.string_req.should.equal("gaga");
                Number(instance.num_with_params).should.equal(0);
                should.not.exist(instance.enum);
                instance.object.object.object.nested_string_req.should.equal("gigi");
                //Number(instance.list_o_numbers[0]).should.equal(0);

                this.req.app.render(view, options, function (err, doc) {
                    if (err) return done(err);
                    should.exist(doc);
                    doc.replace(/\r|\n/g, '').replace(/pages\?ref=.+"/, '').should.equal(renderedDoc);
                    return done();
                });
            };
            ctx.app.handle(mock_req, mock_res);
        };
        ctx.app.handle(mock_req, mock_res);
    });


    describe("nested & embeded", function () {
        it.skip("should get updated", function (done) {
            step1(done);
        });
    });

    describe('core screens', function () {
        require('./common/core_test')(ctx);
    });

    after(function () {
        ctx.mongoose.disconnect();
        delete ctx.mongoose;
        delete ctx.app;
    });
})
;

var section_snippet = '<div class="section"><h2><span>Configuration</span></h2><ul class="models"><li><div class="btn-group pull-right"><a href="/admin/model/config/document/single" class="btn btn-default">Edit</a></div><a href="/admin/model/config/document/single"><h3>הגדרות</h3></a></li></ul></div>';
var renderedDoc = require('fs').readFileSync('test/fixtures/rendered_doc.text', 'utf-8').replace(/\r|\n/g, '').replace(/pages\?ref=.+"/, '');
