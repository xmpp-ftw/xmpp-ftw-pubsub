var should  = require('should')
  , PubSub  = require('../../lib/pubsub')
  , ltx     = require('ltx')
  , helper  = require('../helper')

describe('Publish-Subscribe', function() {

    var pubsub, socket, xmpp, manager

    before(function() {
        socket = new helper.Eventer()
        xmpp = new helper.Eventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            }
        }
        pubsub = new PubSub()
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
           var stanza = new ltx.parse('<message><event xmlns="' 
               + pubsub.NS_EVENT + '" /></message>')
           pubsub.handles(stanza).should.be.true
       })

       it('Handles authorisation requests', function() {
           var stanza = new ltx.parse(
               '<message><x><field type="hidden"><value>'
               + pubsub.NS_SUBSCRIBE_AUTHORISATION
               + '</value></field></x></message>'
           )
           pubsub.handles(stanza).should.be.true
       })

       it('Doesn\'t handle other messages', function() {
           var stanza = new ltx.parse('<message><event xmlns="'
               + pubsub.NS_PUBSUB + '" /></message>')
           pubsub.handles(stanza).should.be.false
       })

    })

    describe('Handles authorisation requests', function() {

        it('Sends expected data', function(done) {
            var stanza = helper.getStanza('subscription-authorisation')
            var callback = function(data, callback) {
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

})
