

const {
    OPCUAClient,
    AttributeIds,
    ClientSubscription,
    TimestampsToReturn
} = require("node-opcua");
const async = require("async");
const mqtt = require('mqtt')

const client = OPCUAClient.create({ endpoint_must_exist: false });

const endpointUrl = "opc.tcp://opc-micro:50000";
const nodeId = "ns=2;s=SlowUInt4";
const TIMER = 500000
const DEVICE = "microsoft"
const MQTTURL = 'tcp://broker.mqttdashboard.com:1883'
const clientMqtt = mqtt.connect(MQTTURL)

clientMqtt.on('connect', () => {
    console.log("mqtt connecteed to broker" +MQTTURL)
    clientMqtt.publish('imh/connected', DEVICE)
    clientMqtt.subscribe('imh/#')
})

clientMqtt.on('message', (topic, message) => {
    console.log("New temperature", topic.toString(), message.toString())
})



const { Pool, Client } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "timescale",
    database: "in4pl",
    password: "password",
    port: "5432"
});

/** @type ClientSession */
let theSession = null;

/** @type ClientSubscription */
let theSubscription = null;
async.series([


    // step 1 : connect to
    function (callback) {

        client.connect(endpointUrl, function (err) {

            if (err) {
                console.log(" cannot connect to endpoint :", endpointUrl);
            } else {
                console.log("connected to opc ua server "+ endpointUrl);
            }
            callback(err);
        });
    },
    // step 2 : createSession
    function (callback) {
        client.createSession(function (err, session) {
            if (!err) {
                theSession = session;
            }
            callback(err);
        });

    },
    // step 3 : browse
    function (callback) {

        theSession.browse("RootFolder", function (err, browse_result) {
            if (!err) {
                browse_result.references.forEach(function (reference) {
                    console.log(reference.browseName);
                });
            }
            callback(err);
        });
    },
    // step 4 : read a variable
    function (callback) {
        theSession.read({
            nodeId,
            attributeId: AttributeIds.Value
        }, (err, dataValue) => {
            if (!err) {
                console.log(" read value = ", dataValue.toString());
            }
            callback(err);
        })
    },

    // step 5: install a subscription and monitored item
    //
    // -----------------------------------------
    // create subscription
    function (callback) {

        theSession.createSubscription2({
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 20,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        }, function (err, subscription) {
            if (err) { return callback(err); }
            theSubscription = subscription;

            theSubscription.on("keepalive", function () {
                console.log("keepalive");
            }).on("terminated", function () {
            });
            callback();
        });

    }, function (callback) {
        // install monitored item
        //
        theSubscription.monitor({
            nodeId,
            attributeId: AttributeIds.Value
        },
            {
                samplingInterval: 100,
                discardOldest: true,
                queueSize: 10
            }, TimestampsToReturn.Both,
            (err, monitoredItem) => {
                console.log("-------------------------------------");
                monitoredItem
                    .on("changed", function (value) {
                        console.log(" New Value = ", value.toString());
                        const newValue = value.value.value.toString();
                        clientMqtt.publish('imh/' + DEVICE + '/temperature', newValue)

                        pool.connect((err, client, release) => {
                            if (err) {
                                return console.error('Error acquiring DB client', err.stack)
                            }
                            let myQuery = "INSERT INTO data(time, temperature, sensor) VALUES ($1,$2,$3)"

                            client.query(myQuery, [new Date(value.serverTimestamp), newValue,DEVICE], (err, result) => {
                                release()
                                if (err) {
                                    return console.error('Error executing DB  query', err.stack)
                                }
                                console.log(result.rows)
                            })
                        })



                    })
                    .on("err", (err) => {
                        console.log("MonitoredItem err =", err.message);
                    });
                callback(err);

            });
    }, function (callback) {
        console.log("Waiting 5 seconds")
        setTimeout(() => {
            theSubscription.terminate();
            callback();
        }, TIMER);
    }, function (callback) {
        console.log(" closing session");
        theSession.close(function (err) {
            console.log(" session closed");
            callback();
        });
    },

],
    function (err) {
        if (err) {
            console.log(" failure ", err);
            process.exit(0);
        } else {
            console.log("done!");
        }
        client.disconnect(function () { });
    });
