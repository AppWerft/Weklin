var args = arguments[0] || {};

// Requerimos el módulo para el mapa
var MapModule = require('ti.map');

// Requerimos el módulo direcciones de google
var gd = require("de.codewire.google.directions");

// Obtenemos el identificador del usuario/dispositivo
var nUUID = Alloy.Globals.nUUID;

// Array for vehicle locations
var aVehicleLocations = [];

// StartupChannel
var cCurrentChannel = '';
var cLastChannel = 'NoChannel';
var cPostalCode = '';

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



// Android GPS Setup
if (Titanium.Platform.name == 'android') {
	// demonstrates manual mode:
	var providerGps = Ti.Geolocation.Android.createLocationProvider({
	    name: Ti.Geolocation.PROVIDER_GPS,
	    minUpdateDistance: 5,
	    minUpdateTime: 10
	});
	Ti.Geolocation.Android.addLocationProvider(providerGps);
	Ti.Geolocation.Android.manualMode = true;
	
	var reportPosition = function(e) {
	    if (!e.success || e.error) {
	        Ti.API.info('error:' + JSON.stringify(e.error));
	    } else {
	    	
	    	// Quitamos marcadores
		    mapview.removeAllAnnotations();
		    	
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
			
			mapview.setRegion(region);
			mapview.setLocation(region);
			
			var cCarMarker = getMarker(heading);
			
			var userPin = MapModule.createAnnotation({
			    latitude: latitude,
				longitude: longitude,
				customView: cCarMarker,
			    image: cCarMarker,
			    title: 'My Location',
			    subtitle: nUUID,
			    animate: true,
			    draggable: false,
			    id: nUUID
			});
			
			// Agregamos
			mapview.addAnnotation(userPin);
			
			// try to get address
		    Titanium.Geolocation.reverseGeocoder(latitude, longitude, function(evt) {
		        //here we will store address information
		        var street;
		        var city;
		        var country;
		        if (evt.success) {
		            var places = evt.places;
		            //alert(JSON.stringify(places));
		            if (places && places.length) {
		                cPostalCode = places[0].postalCode;
		                cPostalCode = cPostalCode.replace(/[^0-9]/g, '');
		            } else {
		                address = "No address found";
		            }
		        }
		    });
		    
		    // Suscrpicion al canal de actualizaciones de ubicación
			if (cPostalCode!=cLastChannel && cPostalCode!=''){
				pubnub.subscribe({
				 	channel: cPostalCode,
				 	message: function (message) {
						Ti.API.info("Vehicle: " + message.nUUID);
				  	}
				});
				cLastChannel = cPostalCode;
				//alert('Last Channel:' +cLastChannel);
			} else {
				// Seguimos en el mismo canal
			}
			
			var dUpdateTime = new Date();
			pubnub.state({
				channel: cLastChannel,
				uuid: nUUID,
				state: { 
					id: nUUID, 
					lat: latitude, 
					lng: longitude, 
					speed: speed, 
					heading: heading, 
					altitude: altitude,
					lastUpdate: dUpdateTime
				},
				callback: function(m){
					//alert('Callback Set State: '+m);
				},
				error: function(m){
					//alert('Error Set State: '+m);
				}
			});
			
	        Ti.API.info('Coordinates: ' + JSON.stringify(e.coords));
	        Ti.API.info('Current Channel: ' + cCurrentChannel);
	        Ti.API.info('Last Channel: ' + cLastChannel);
	    }
	};
	Ti.Geolocation.addEventListener('location', reportPosition);
}

// IOS GPS Setup
if (Titanium.Platform.name == 'iPhone OS') {
	if (Ti.Geolocation.locationServicesEnabled) {
	    Ti.Geolocation.purpose = 'Get Current Location';
	    Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
	    Ti.Geolocation.distanceFilter = 10;
	    Ti.Geolocation.preferredProvider = Ti.Geolocation.PROVIDER_GPS;
	    var reportPosition = function(e) {
		    if (!e.success || e.error) {
		        Ti.API.info('error:' + JSON.stringify(e.error));
		    } else {
		    	
		    	// Quitamos marcadores
			    mapview.removeAllAnnotations();
			    	
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
				
				mapview.setRegion(region);
				mapview.setLocation(region);
				
				var cCarMarker = getMarker(heading);
				var userPin = MapModule.createAnnotation({
				    latitude: latitude,
					longitude: longitude,
				   	customView: cCarMarker,
			    	image: cCarMarker,
				    title: 'My Location',
				    subtitle: nUUID,
				    animate: true,
				    draggable: false,
				    id: nUUID
				});
				
				// Agregamos
				mapview.addAnnotation(userPin);
				
				// try to get address
			    Titanium.Geolocation.reverseGeocoder(latitude, longitude, function(evt) {
			        //here we will store address information
			        var street;
			        var city;
			        var country;
			        if (evt.success) {
			            var places = evt.places;
			            //alert(JSON.stringify(places));
			            if (places && places.length) {
			                cPostalCode = places[0].zipcode;
			            } else {
			                address = "No address found";
			            }
			        } else {
			        	alert('ReverseGeocoder Error:' + evt.error);
			        }
			        //alert(places[0].zipcode);
			    });
			    
			    // Suscrpicion al canal de actualizaciones de ubicación
				if (cPostalCode!=cLastChannel && cPostalCode!=''){
					pubnub.subscribe({
					 	channel: cPostalCode,
					 	message: function (message) {
							Ti.API.info("Vehicle: " + message);
					  	}
					});
					cLastChannel = cPostalCode;
					//alert('Last Channel:' +cLastChannel);
				} else {
					// Seguimos en el mismo canal
				}
				
				var dUpdateTime = new Date();
				pubnub.state({
					channel: cLastChannel,
					uuid: nUUID,
					state: { 
						id: nUUID, 
						lat: latitude, 
						lng: longitude, 
						speed: speed, 
						heading: heading, 
						altitude: altitude,
						lastUpdate: dUpdateTime
					},
					callback: function(m){
						//alert('Callback Set State: '+m);
					},
					error: function(m){
						//alert('Error Set State: '+m);
					}
				});
				
		        Ti.API.info('Coordinates: ' + JSON.stringify(e.coords));
		        Ti.API.info('Current Channel: ' + cCurrentChannel);
		        Ti.API.info('Last Channel: ' + cLastChannel);
		    }
		};
		Ti.Geolocation.addEventListener('location', reportPosition);
	} else {
	    alert('Please enable location services');
	}
}

// Creamos una vista con el mapa
var mapview = MapModule.createView({
	mapType: MapModule.NORMAL_TYPE,
	animate: true,
	regionFit: true,
	region: {
		latitudeDelta: 0.01,
	    longitudeDelta: 0.01
	},
	userLocation: true,	
	visible: true,
  	zoom: 1
});


setInterval(function() {
	alert('Interval: '+cLastChannel);
	pubnub.here_now({
		channel: cLastChannel,
		metadata: 1,
		callback: function (data) {
			
		  	// Quitamos marcadores
			//mapview.removeAllAnnotations();
			if (data.lenght>0){
				// Agregamos ubicaciones de vehiculos
			  	for (i = 0; i < data.uuids.length; i++) {
			  		
			  		cAnnotationUUID = data.uuids[i];
			  		
			  		//alert('Channel: '+cPostalCode);
			  		//alert('Data Uuids: '+data.uuids[i]);
			  		
			  		if (cAnnotationUUID == Alloy.Globals.nUUID){	
						
					} else {
						pubnub.state({
							channel: cLastChannel,
							uuid: cAnnotationUUID,
							callback: function(m){
								alert('Callback State: '+JSON.stringify(m));
								var cCarMarker = getMarker(m.heading);
								var userPin = MapModule.createAnnotation({
								    latitude: m.lat,
									longitude: m.lng,
								    customView: cCarMarker,
			    					image: cCarMarker,
								    title: 'My Location',
								    subtitle: cAnnotationUUID,
								    animate: true,
								    draggable: false,
								    id: cAnnotationUUID
								});
								
								// Agregamos
								mapview.addAnnotation(userPin);
							},
							error: function(m){
								Ti.API.info(m);
							}
						});
					}
					
				}	
			}

		    //alert("There are " + data.uuids.length + " online.");
		    //alert(JSON.stringify(data.uuids));
	  	}
	});
	
}, 15000);


// Calculamos el trayecto al cliente desde la ubicación del empleado
// retrieve location
var aOrigin = "30.527804, -97.792818";
var aDestination = "30.531223, -97.790994";

getRoute(aOrigin, aDestination);

function getRoute(aOrigin, aDestination) {
	var activeRoutes = [];
	gd.getRoute({
	    origin: aOrigin, // required
	    destination: aDestination, // required
	    color: '#3A65AD', // defaults to '#FF0000'
	    mode: gd.travelModes.driving, // defaults to driving
	    name: 'single',
	    width: 8,
	    language: gd.languages.ENGLISH,
	    optimize: true, // wont work
	    callback: function(response) {
	    	
	        if (response.status == 'OK') {
	            var points = response.route.points;
	            
	            mapview.setRegion({
	                // latitude : points[(points.length -1) / 2].latitude,
	                // longitude : points[(points.length -1) / 2].longitude,
	                latitudeDelta: 0.01,
		    		longitudeDelta: 0.01
	            });
	
	            var mapRoute = MapModule.createRoute(response.route);
	            mapview.addRoute(mapRoute);
	            activeRoutes.push(mapRoute);
	
	            // loop each point to get distance, duration & instruction
	            for (var idx in points) {
	                var point = points[idx];
	                if (point.isMaster) {
	                    var distance = point.distance;
	                    var duration = point.duration;
	                    var instruction = point.instruction;
	                }
	            }
	
	        } else {
	            /**
	             * Error handling.
	             * The Error object contains "status" & msg properties.
	             */
	            alert(response.msg);
	        }
	    }
	});	
}

function getMarker(nDegrees) {
	if (Titanium.Platform.name == 'android') {
		var view = Ti.UI.createView({
			width: 20,
			height: 40,
			backgroundImage: "/images/car1.png"
		});
	}
	
	if (Titanium.Platform.name == 'iPhone OS') {
		var view = Ti.UI.createView({
			width: 20,
			height: 40,
			backgroundImage: "markers/car1.png"
		});
	} 
	
	var container = Ti.UI.createView({
	      width: 20,
	      height: 40
	});
	container.add(view);
	  
	// setup rotate transform matrix
	var t3 = Ti.UI.create2DMatrix();
	t3 = t3.rotate(nDegrees);
	  
	var a = Ti.UI.createAnimation({
		transform: t3,
		duration: 1
	});
	view.animate(a);
	return container;
}

// Address Search Window
function locationSearch(){
	Alloy.Globals.mainDrawer.openWindow(Alloy.createController('locationSearch').getView());
}

// Cargamos Mapa en vista
$.mapContainer.add(mapview);