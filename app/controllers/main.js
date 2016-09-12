var args = arguments[0] || {};

// Requerimos el módulo core del staff
var oCore = require('core');

// Requerimos el módulo para el mapa
var MapModule = require('ti.map');

// Requerimos el módulo direcciones de google
//var gd = require("de.codewire.google.directions");

// Obtenemos el identificador del usuario/dispositivo
var nUUID = Alloy.Globals.nUUID;

// Array for vehicle locations
var aVehicleLocations = [];

// Update Time
var dUpdateTime = new Date();

// Canal de Publicaciones
var cCityChannel = '';
var cLastChannel = '';
var street;
var country;

// MapView Create
var mapview = MapModule.createView({
	mapType: MapModule.NORMAL_TYPE,
	animate: true,
	traffic: true,
	regionFit: true,
	region: {
		latitudeDelta: 0.01,
	    longitudeDelta: 0.01 
	},
	userLocation: true,	
	visible: true,
  	zoom: 1
});

// ----------------------------------
// INIT PUBNUB
// ----------------------------------
var pubnub = require('pubnub')({
    publish_key   : 'pub-c-df8c4684-dd7e-4b54-8510-73d046926724',
	subscribe_key : 'sub-c-bf1615b4-ec9b-11e5-8112-02ee2ddab7fe',
	uuid          : nUUID,
    ssl           : false,
    origin        : 'pubsub.pubnub.com',
    heartbeat	  : 120,
    heartbeat_interval: 30  
});

// Listening for dispatch data
pubnub.subscribe({
  channel: 'dispatch',
  message: function (message) {
    Ti.API.info("Picking up user at: " + message.lat + ", " + message.lng);
    // Business logic...
  },
  presence: function(presence){ 
  	Ti.API.info("New Vehicle: " + JSON.stringify(presence));
  	// Called when a user comes online 
  },
});

pubnub.subscribe({
  channel: 'vehicle_status',
  message: function (message) {
    // App code...
  },
  metadata: {
    vehicle_id: Alloy.Globals.nUUID,
    state: {
      type: "onDuty",
      time: dUpdateTime
    }
  }
});

// Android GPS Setup
if (Titanium.Platform.name == 'android') {
	// demonstrates manual mode:
	var providerGps = Ti.Geolocation.Android.createLocationProvider({
	    name: Ti.Geolocation.PROVIDER_GPS,
	    minUpdateTime: 10, // Segundos
    	minUpdateDistance: 5 // Metros
	});
	Ti.Geolocation.Android.addLocationProvider(providerGps);
	Ti.Geolocation.Android.manualMode = true;
	
	// Regla para optimizar el envio de posicion en android
	// var gpsRule = Ti.Geolocation.Android.createLocationRule({
	    // provider: Ti.Geolocation.PROVIDER_GPS,
	    // // Updates should be accurate to 100m
	    // accuracy: 30,
	    // // Updates should be no older than 5m
	    // maxAge: 300000,
	    // // But  no more frequent than once per 30 seconds
	    // minAge: 30000
	// });
	
	// Ti.Geolocation.Android.addLocationRule(gpsRule);
	var reportPosition = function(e) {
	    if (!e.success || e.error) {
	        Ti.API.info('error:' + JSON.stringify(e.error));
	    } else {
	    	// Quitamos marcadores
		    //mapview.removeAllAnnotations();
	    	var longitude = e.coords.longitude;
			var latitude = e.coords.latitude;
			var altitude = e.coords.altitude;
			var heading = e.coords.heading;
			var accuracy = e.coords.accuracy;
			var speed = e.coords.speed;
			var timestamp = e.coords.timestamp;
			var altitudeAccuracy = e.coords.altitudeAccuracy;
			
			var region = {
				latitude: latitude,
				longitude: longitude,
				userLocation: true,
				latitudeDelta: 0.01,
	    		longitudeDelta: 0.01
			};
			
			//mapview.setRegion(region);
			mapview.setLocation(region);
			
			// try to get address
			Titanium.Geolocation.reverseGeocoder(latitude, longitude, function(evt) {
			    //here we will store address information
			    if (evt.success) {
			        var places = evt.places;
			        //alert(JSON.stringify(places));
			        if (places && places.length) {
		                street = places[0].street;
		                cCityChannel = places[0].city;
		                country = places[0].country_code;
		            } else {
		            	cCityChannel = '';
		                address = "No address found";
		            }
			    }
			});
			
			// Suscrpicion al canal de actualizaciones de ubicación
			if (cCityChannel!=cLastChannel && cCityChannel!='') {
				// Nos salimos del canal anterior 
				pubnub.unsubscribe({
				    channel : cLastChannel,
				});
				
				// Entramos al nuevo canal
				pubnub.subscribe({
				 	channel: cCityChannel,
				 	message: function (message) {
				    	Ti.API.info("Vehicle: " + message.vehicle_id);
				    	Ti.API.info("Is located at: " + message.lat + ", " + message.lng);
				    	
				    	// eliminamos el marcador coche del mapa para poner la nueva posicion
				    	mapview.removeAnnotation(message.vehicle_id);
				    	
				    	// determinamos que marcador usar
				    	if (message.vehicle_id==nUUID) {
				    		var nType = '2';
				    	} else {
				    		var nType = '1';
				    	}
				    	
				    	var cCarMarker = oCore.getMarker(message.heading, nType);
						var userPin = MapModule.createAnnotation({
						    latitude: message.lat,
							longitude: message.lng,
							//image: cCarMarker,
						   	customView: cCarMarker,
						    title: message.vehicle_id,
						    subtitle: message.vehicle_id,
						    animate: false,
						    draggable: false,
						    id: message.vehicle_id
						});
						
						// Agregamos el automovil al mapa
						mapview.addAnnotation(userPin);
				  	}
				});
				
				cLastChannel = cCityChannel;
				$.markerLocation1.setText(street);
				$.markerLocation2.setText(cCityChannel);
				
			} else {
				// Seguimos en el mismo canal
			}
			
			// Actualizamos en el canal de la ciudad la ubicacion
			if (cCityChannel!='') {
				Ti.API.info('Publicamos: '+cCityChannel);
				var dUpdateTime = new Date();
				pubnub.publish({
					channel: cCityChannel,
					message: { 
						vehicle_id: nUUID, 
						lat: latitude, 
						lng: longitude, 
						speed: speed, 
						heading: heading, 
						altitude: altitude,
						lastUpdate: dUpdateTime.toLocaleTimeString('en-US', { hour12: false })
					}
				});
			}
			
	        Ti.API.info('Coordinates: ' + JSON.stringify(e.coords));
	    }
	};
	
	Ti.Geolocation.addEventListener('location', reportPosition);
}

// IOS GPS Setup
if (Titanium.Platform.name == 'iPhone OS') {
	if (Ti.Geolocation.locationServicesEnabled) {
	    Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
	    Ti.Geolocation.distanceFilter = 10;
	    Ti.Geolocation.preferredProvider = Ti.Geolocation.PROVIDER_GPS;

		var reportPosition = function(e) {
		    if (!e.success || e.error) {
		        Ti.API.info('error:' + JSON.stringify(e.error));
		    } else {
		    	// Quitamos marcadores
			    //mapview.removeAllAnnotations();
		    	var longitude = e.coords.longitude;
				var latitude = e.coords.latitude;
				var altitude = e.coords.altitude;
				var heading = e.coords.heading;
				var accuracy = e.coords.accuracy;
				var speed = e.coords.speed;
				var timestamp = e.coords.timestamp;
				var altitudeAccuracy = e.coords.altitudeAccuracy;
				
				var region = {
					latitude: latitude,
					longitude: longitude,
					userLocation: true,
					latitudeDelta: 0.01,
		    		longitudeDelta: 0.01
				};
				
				//mapview.setRegion(region);
				mapview.setLocation(region);
				
				// try to get address
				Titanium.Geolocation.reverseGeocoder(latitude, longitude, function(evt) {
				    //here we will store address information
				    
				    if (evt.success) {
				        var places = evt.places;
				        //alert(JSON.stringify(places));
				        if (places && places.length) {
			                street = places[0].street;
			                cCityChannel = places[0].city;
			                country = places[0].country_code;
			            } else {
			            	cCityChannel = '';
			                address = "No address found";
			            }
				    }
				});
				
				// Suscrpicion al canal de actualizaciones de ubicación
				if (cCityChannel!=cLastChannel && cCityChannel!='') {
					// Nos salimos del canal anterior 
					pubnub.unsubscribe({
					    channel : cLastChannel,
					});
					
					// Entramos al nuevo canal
					pubnub.subscribe({
					 	channel: cCityChannel,
					 	message: function (message) {
					    	Ti.API.info("Vehicle: " + message.vehicle_id);
					    	Ti.API.info("Is located at: " + message.lat + ", " + message.lng);
					    	
					    	// eliminamos el marcador coche del mapa para poner la nueva posicion
					    	mapview.removeAnnotation(message.vehicle_id);
					    	
					    	// determinamos que marcador usar
					    	if (message.vehicle_id==nUUID) {
					    		var nType = '2';
					    	} else {
					    		var nType = '1';
					    	}
					    	
					    	var cCarMarker = oCore.getMarker(message.heading, nType);
					    	
							var userPin = MapModule.createAnnotation({
							    latitude: message.lat,
								longitude: message.lng,
								//image: cCarMarker,
						   		customView: cCarMarker,
							    title: message.vehicle_id,
							    subtitle: message.vehicle_id,
							    animate: false,
							    draggable: false,
							    id: message.vehicle_id
							});
							
							// Agregamos el automovil al mapa
							mapview.addAnnotation(userPin);
					  	}
					});
					
					cLastChannel = cCityChannel;
					$.markerLocation1.setText(street);
					$.markerLocation2.setText(cCityChannel);
					
				} else {
					// Seguimos en el mismo canal
				}
				
				// Actualizamos en el canal de la ciudad la ubicacion
				if (cCityChannel!='') {
					Ti.API.info('Publicamos: '+cCityChannel);
					var dUpdateTime = new Date();
					pubnub.publish({
						channel: cCityChannel,
						message: { 
							vehicle_id: nUUID, 
							lat: latitude, 
							lng: longitude, 
							speed: speed, 
							heading: heading, 
							altitude: altitude,
							lastUpdate: dUpdateTime.toLocaleTimeString('en-US', { hour12: false })
						}
					});
				}
				
		        Ti.API.info('Coordinates: ' + JSON.stringify(e.coords));
		    }
		};
		
		Ti.Geolocation.addEventListener('location', reportPosition);
		
	} else {
	    alert('Please enable location services');
	}
}

// Iniciamos on Duty
//oCore.onDuty();

//Ti.Geolocation.addEventListener($.locationSearch, locationSearch);

// try to get address
Titanium.Geolocation.reverseGeocoder(30.527935, -97.792357, function(evt) {
    //here we will store address information
    
    if (evt.success) {
        var places = evt.places;
        alert(JSON.stringify(places));
        if (places && places.length) {
            street = places[0].street;
            cCityChannel = places[0].city;
            country = places[0].country_code;
        } else {
        	cCityChannel = '';
            address = "No address found";
        }
    }
});

$.btnRequestService.addEventListener('click', function(e) {
	pubnub.publish({
		channel : 'dispatch',
		message: {
			"aps" : {
			"alert" : "Cleaning Request",
			"badge" : 9,
			"sound" : "default"
		},
		"acme 1" : 42
		}
	});
});



// Cargamos Mapa en vista
$.mapContainer.add(mapview);