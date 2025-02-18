// MQTT Configuration
let client;
let topic = "ENGO551/Jaden/my_temperature"; 
let isConnected = false;
let marker;
let isManuallyDisconnected = false;

// MQTT Connection Function
function connectMQTT() {
    let host = document.getElementById("mqttHost").value || "test.mosquitto.org";
    let port = parseInt(document.getElementById("mqttPort").value) || 8080;

    let wsHost = `ws://${host}:${port}/mqtt`;

    client = new Paho.MQTT.Client(wsHost, "client-" + Math.random().toString(36).substring(7));

    client.onConnectionLost = (responseObject) => {
        isConnected = false;
        if (isManuallyDisconnected) {
            alert("Connection closed.");
            isManuallyDisconnected = false;
        } else {
            alert("Connection lost. Reconnecting...");
            console.log("Connection lost. Trying to reconnect...");
            document.getElementById("connectBtn").disabled = false;
            document.getElementById("disconnectBtn").disabled = true;
            document.getElementById("shareStatusBtn").disabled = true;
            reconnectMQTT();
        }
    };
    
    function reconnectMQTT() {
        if (!isConnected) {
            console.log("Attempting to reconnect...");
            setTimeout(() => {
                console.log("Calling connectMQTT...");
                connectMQTT(); 
            }, 3000); 
        } else {
            console.log("Already connected, not attempting to reconnect.");
        }
    }

    client.onMessageArrived = (message) => {
        let data = JSON.parse(message.payloadString);
        updateMap(data); 
    };

    client.connect({
        onSuccess: () => {
            isConnected = true;
            document.getElementById("connectBtn").disabled = true;
            document.getElementById("disconnectBtn").disabled = false;
            document.getElementById("shareStatusBtn").disabled = false;
            document.getElementById("mqttHost").disabled = true;
            document.getElementById("mqttPort").disabled = true;
            client.subscribe(topic);
        },
        onFailure: (error) => {
            alert("Failed to connect: " + error.errorMessage);
        }
    });
}

// Disconnect MQTT
function disconnectMQTT() {
    if (client && isConnected) {
        isManuallyDisconnected = true;
        client.disconnect();
        isConnected = false;
        document.getElementById("mqttHost").disabled = false;
        document.getElementById("mqttPort").disabled = false;
        document.getElementById("connectBtn").disabled = false;
        document.getElementById("disconnectBtn").disabled = true;
        document.getElementById("shareStatusBtn").disabled = true;

        // Reset map
        if (marker) {
            map.removeLayer(marker);
        }
        map.setView([51.0447, -114.0719], 10);
    }
}

function getRandomTemperature() {
    return Math.floor(Math.random() * 100) - 40;
}

// Send Geolocation Data
function shareStatus() {
    if (!isConnected) {
        alert("Not connected to MQTT broker!");
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;
            let temperature = getRandomTemperature();

            let geojson = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                },
                properties: {
                    temperature: temperature
                }
            };

            let message = new Paho.MQTT.Message(JSON.stringify(geojson));
            message.destinationName = topic;
            client.send(message);

        }, (error) => {
            alert("Geolocation error: " + error.message);
        });
    } else {
        alert("Geolocation is not supported by your browser");
    }
}

// Map
let map = L.map('map').setView([51.0447, -114.0719], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Update Map with new location
function updateMap(data) {
    let lat = data.geometry.coordinates[1];
    let lon = data.geometry.coordinates[0];
    let temp = data.properties.temperature;

    let color = temp < 10 ? "blue" : temp < 30 ? "green" : "red";

    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.circleMarker([lat, lon], {
        color: color,
        radius: 10
    }).addTo(map).bindPopup(`Temperature: ${temp}°C`).openPopup();

    map.setView([lat, lon], 13);
}

// Event Listeners
document.getElementById("connectBtn").addEventListener("click", connectMQTT);
document.getElementById("disconnectBtn").addEventListener("click", disconnectMQTT);
document.getElementById("shareStatusBtn").addEventListener("click", shareStatus);
