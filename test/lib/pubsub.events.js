'use strict';

/* jshint -W030 */

var PubSub  = require('../../index')
  , ltx     = require('ltx')
  , helper  = require('../helper')

describe('Publish-Subscribe', function() {

    var pubsub, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            _getLogger: function() {
                return {
                    log: function() {},
                    error: function() {},
                    warn: function() {},
                    info: function() {}
                }
            }
        }
        pubsub = new PubSub()
        pubsub.init(manager)
    })

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        pubsub.init(manager)
    })

    describe('Handles certain packets', function() {

        it('Doesn\'t handle <iq> packets', function() {
            pubsub.handles(new ltx.parse('<iq/>')).should.be.false
        })

        it('Doesn\'t handle <presence> packets', function() {
            pubsub.handles(new ltx.parse('<presence/>')).should.be.false
        })

        it('Handles messages with \'event\' namespace', function() {
            var stanza = new ltx.parse('<message><event xmlns="' +
                pubsub.NS_EVENT + '" /></message>')
            pubsub.handles(stanza).should.be.true
        })

        it('Handles authorisation requests', function() {
            var stanza = new ltx.parse(
                '<message><x><field type="hidden"><value>' +
                pubsub.NS_SUBSCRIBE_AUTHORISATION +
                '</value></field></x></message>'
            )
            pubsub.handles(stanza).should.be.true
        })

        it('Doesn\'t handle other messages', function() {
            var stanza = new ltx.parse('<message><event xmlns="' +
                pubsub.NS_PUBSUB + '" /></message>')
            pubsub.handles(stanza).should.be.false
        })

    })

    describe('Handles authorisation requests', function() {

        it('Sends expected data', function(done) {
            var stanza = helper.getStanza('subscription-authorisation')
            var callback = function(data) {
                data.id.should.equal('1')
                data.from.should.equal('pubsub.shakespeare.lit')
                data.form.title.should.equal('Subscription request')
                data.form.instructions.should.equal('Ok or cancel')
                data.form.fields.length.should.equal(3)

                data.form.fields[0].var.should.equal('pubsub#node')
                data.form.fields[0].type.should.equal('text-single')
                data.form.fields[0].label.should.equal('Node')
                data.form.fields[0].value.should.equal('twelfth night')

                data.form.fields[1].var.should.equal('pubsub#subscriber_jid')
                data.form.fields[1].type.should.equal('jid-single')
                data.form.fields[1].label.should.equal('Subscriber Address')
                data.form.fields[1].value.should.equal('romeo@example.com')

                data.form.fields[2].var.should.equal('pubsub#allow')
                data.form.fields[2].type.should.equal('boolean')
                data.form.fields[2].label.should.equal('Allow?')
                data.form.fields[2].value.should.be.false

                done()
            }
            socket.once('xmpp.pubsub.push.authorisation', callback)
            pubsub.handle(stanza)
        })

        it('Errors if data form can not be parsed', function(done) {
            var stanza = helper.getStanza('subscription-authorisation')
            var callback = function(data, callback) {
                callback({})
            }
            // No client callback so we arrive at a standard event
            socket.once('xmpp.error.client', function(data) {
                data.should.eql({ type: 'modify',
                    condition: 'client-error',
                    description: 'Badly formatted data form',
                    request: {}
                })
                done()
            })

            socket.once('xmpp.pubsub.push.authorisation', callback)
            pubsub.handle(stanza)
        })

        it('Sends expected response stanza', function(done) {
            var stanza = helper.getStanza('subscription-authorisation')
            xmpp.once('stanza', function(stanza) {
                stanza.is('message').should.be.true
                stanza.attrs.to.should.equal('pubsub.shakespeare.lit')
                stanza.attrs.id.should.equal('1')
                var dataForm = stanza.getChild('x', 'jabber:x:data')
                dataForm.should.exist
                dataForm.attrs.type.should.equal('submit')
                dataForm.children.length.should.equal(2)
                dataForm.children[0].attrs.var.should.equal('FORM_TYPE')
                dataForm.children[0].getChildText('value')
                    .should.equal(pubsub.NS_SUBSCRIBE_AUTHORISATION)
                dataForm.children[1].attrs.var.should.equal('pubsub#allow')
                dataForm.children[1].getChildText('value')
                    .should.equal('true')
                done()
            })
            var callback = function(data, callback) {
                callback([
                    { var: 'pubsub#allow', value: true }
                ])
            }
            socket.once('xmpp.pubsub.push.authorisation', callback)
            pubsub.handle(stanza)
        })

    })

    describe('Handles incoming event notifications', function() {

        describe('New items', function() {

            it('Handles basic item notification', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '">' +
                    '<items node="twelfth night">' +
                    '<item id="item-5"></item>' +
                    '</items></event></message>'
                )
                socket.once('xmpp.pubsub.push.item', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    data.id.should.equal('item-5')
                    done()
                })
                pubsub.handle(stanza)
            })

            it('Handles full item notification', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '">' +
                    '<items node="twelfth night">' +
                        '<item id="item-5" publisher="romeo@example.com">' +
                            '<body>item-5-content</body>' +
                        '</item>' +
                    '</items></event>' +
                    '<delay stamp="2013-06-23 20:00:00+0100" />' +
                    '<headers xmlns="' + pubsub.NS_HEADERS + '">' +
                        '<header name="key">value</header>' +
                    '</headers>' +
                    '</message>'
                )
                socket.once('xmpp.pubsub.push.item', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    data.id.should.equal('item-5')
                    data.entry.should.eql({ body: 'item-5-content' })
                    data.delay.should.equal('2013-06-23 20:00:00+0100')
                    data.headers.should.eql([
                        { name: 'key', value: 'value' }
                    ])
                    data.publisher.should.eql({
                        domain: 'example.com',
                        user: 'romeo'
                    })
                    done()
                })
                pubsub.handle(stanza)
            })

        })

        describe('Item retract', function() {

            it('Handles a delete', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '">' +
                    '<items node="twelfth night">' +
                        '<retract id="item-5" />' +
                    '</items></event>' +
                    '</message>'
                )
                socket.once('xmpp.pubsub.push.retract', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    data.id.should.equal('item-5')
                    done()
                })
                pubsub.handle(stanza)
            })

            it('Handles delete with headers', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '">' +
                    '<items node="twelfth night">' +
                        '<retract id="item-5" />' +
                    '</items></event>' +
                    '<headers xmlns="' + pubsub.NS_HEADERS + '">' +
                        '<header name="key">value</header>' +
                    '</headers>' +
                    '</message>'
                )
                socket.once('xmpp.pubsub.push.retract', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    data.id.should.equal('item-5')
                    data.headers.should.eql([
                        { name: 'key', value: 'value' }
                    ])
                    done()
                })
                pubsub.handle(stanza)
            })

        })

        it('Passes on subscription updates', function(done) {
            var stanza = new ltx.parse(
                '<message from="pubsub.shakespeare.lit">' +
                '<event xmlns="' + pubsub.NS_EVENT + '">' +
                '<subscription subscription="subscribed" ' +
                    'node="twelfth night" jid="romeo@example.com" />' +
                '</event></message>'
            )
            socket.once('xmpp.pubsub.push.subscription', function(data) {
                data.from.should.equal('pubsub.shakespeare.lit')
                data.node.should.equal('twelfth night')
                data.subscription.should.equal('subscribed')
                data.jid.should.eql({
                    domain: 'example.com',
                    user: 'romeo'
                })
                done()
            })
            pubsub.handle(stanza)
        })

        it('Passes on affiliation change', function(done) {
            var stanza = new ltx.parse(
                '<message from="pubsub.shakespeare.lit">' +
                '<event xmlns="' + pubsub.NS_EVENT + '">' +
                '<affiliations node="twelfth night">' +
                    '<affiliation affiliation="publisher" ' +
                                 'jid="romeo@example.com" />' +
                '</affiliations>' +
                '</event></message>'
            )
            socket.once('xmpp.pubsub.push.affiliation', function(data) {
                data.from.should.equal('pubsub.shakespeare.lit')
                data.node.should.equal('twelfth night')
                data.affiliation.should.equal('publisher')
                data.jid.should.eql({
                    domain: 'example.com',
                    user: 'romeo'
                })
                done()
            })
            pubsub.handle(stanza)
        })

        it('Handles configuration changes', function(done) {
            var stanza = new ltx.parse(
                '<message from="pubsub.shakespeare.lit">' +
                '<event xmlns="' + pubsub.NS_EVENT + '">' +
                '<configuration node="twelfth night">' +
                '<x xmlns="jabber:x:data" type="result">' +
                    '<field var="FORM_TYPE" type="hidden">' +
                    '<value>' + 'http://jabber.org/protocol/pubsub#node_config' +
                        '</value>' +
                    '</field>' +
                    '<field var="pubsub#title">' +
                        '<value>A great comedy</value>' +
                    '</field>' +
                '</x>' +
                '</configuration></event></message>'
            )
            socket.once('xmpp.pubsub.push.configuration', function(data) {
                data.from.should.equal('pubsub.shakespeare.lit')
                data.node.should.equal('twelfth night')
                data.configuration.should.exist
                data.configuration.fields.length.should.equal(1)
                data.configuration.fields[0].var.should.equal('pubsub#title')
                data.configuration.fields[0].value
                    .should.equal('A great comedy')
                done()
            })
            pubsub.handle(stanza)
        })

        describe('Node delete', function() {

            it('Can handle basic node delete', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '" >' +
                    '<delete node="twelfth night"/>' +
                    '</event></message>'
                )
                socket.once('xmpp.pubsub.push.delete', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    done()
                })
                pubsub.handle(stanza)
            })

            it('Can handle node delete with redirect', function(done) {
                var stanza = new ltx.parse(
                    '<message from="pubsub.shakespeare.lit">' +
                    '<event xmlns="' + pubsub.NS_EVENT + '">' +
                    '<delete node="twelfth night">' +
                    '<redirect uri="pubsub.marlowe.lit?node=dido" />' +
                    '</delete></event></message>'
                )
                socket.once('xmpp.pubsub.push.delete', function(data) {
                    data.from.should.equal('pubsub.shakespeare.lit')
                    data.node.should.equal('twelfth night')
                    data.redirect.should.equal('pubsub.marlowe.lit?node=dido')
                    done()
                })
                pubsub.handle(stanza)
            })

        })

        it('Node purge notification', function(done) {
            var stanza = new ltx.parse(
                '<message from="pubsub.shakespeare.lit">' +
                '<event xmlns="' + pubsub.NS_EVENT + '">' +
                '<purge node="twelfth night"/>' +
                '</event></message>'
            )
            socket.once('xmpp.pubsub.push.purge', function(data) {
                data.from.should.equal('pubsub.shakespeare.lit')
                data.node.should.equal('twelfth night')
                done()
            })
            pubsub.handle(stanza)
        })

    })

})