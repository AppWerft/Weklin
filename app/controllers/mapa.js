var mapModule = require('ti.map');
var oCore = require('core');
var numeral = require('numeral');
var anotaciones = [];
var habitaciones = 1;
var banos = 0;
var maxHabitaciones = 6;
var precioRecamaras = 0.0;
var precioBanios = 0.0;
var precioAddons = 0.0;
var subtotal = 0.0;
var cCityChannel = '';
var idSolicitar = 0;
var botonesServicio = [];
var addons = [];
var verifAddons = [];
var actual = "";
var codigoTiempo = "";

var pubnub = require('pubnub')({
    publish_key   : publish_key,
	subscribe_key : subscribe_key,
	uuid          : nUUID,
    ssl           : false,
    origin        : 'pubsub.pubnub.com',
    heartbeat	  : 120,
    heartbeat_interval: 30  
});

if (Titanium.App.Properties.getDouble('latitud') && Titanium.App.Properties.getDouble('longitud')){
	$.mapview.region = {
		latitudeDelta: 0.001,
    	longitudeDelta: 0.001,
    	latitude: Titanium.App.Properties.getDouble('latitud'),
    	longitude: Titanium.App.Properties.getDouble('longitud'),
	};
	solicitarInfo();
}

$.mapview.addEventListener('regionchanged', procesarCambiosRegion);

$.mapview.addEventListener('loading', function(){
	$.pinYo.top = 0;
});

$.mapview.addEventListener('complete', function(){
	$.pinYo.top = '10dp';
});

function cambiarCanal(cual){
	if (cual != null){
		if (cCityChannel != cual){
			anotaciones = [];
			actualizarPines();
			Ti.API.info('cambiar el canal desde ' + cCityChannel + ' al ' + cual);
		    if (cCityChannel != "") pubnub.unsubscribe({channel : cCityChannel,});
		    cCityChannel = cual;
		    pubnub.subscribe({
			 	channel: cCityChannel,
			 	message: function (message) {
			 		if (message.vehicle_id) revisarCarritos(message);
			 		Ti.API.info(JSON.stringify(message));
			  	}
			});
		}
	}
	else cCityChannel = '';
}

function revisarCarritos(datos){
	var encontrado = false;
	for (var a = 0; a < anotaciones.length; a++){
		if (anotaciones[a] != null){
			if (anotaciones[a].id == datos.vehicle_id){
				anotaciones[a].latitude = datos.latitude;
				anotaciones[a].longitude = datos.longitude;
				anotaciones[a].image = imagenHeading(datos.heading);
				encontrado = true;
				return;
			}
		}
	}
	if (encontrado == false){
		Ti.API.info('crear coche con:');
		Ti.API.info(JSON.stringify(datos));
		anotaciones.push(mapModule.createAnnotation({
		    latitude: datos.latitude,
		    longitude: datos.longitude,
		    id: datos.vehicle_id,
		    image: imagenHeading(datos.heading),
		}));
	}
	actualizarPines();
}

function imagenHeading(angulo){
	if (angulo < 0) angulo = 0;
	var carpeta = 'iosCar';
	if (Titanium.Platform.osname == 'android') carpeta = '/androidCar';
	return carpeta + '/' + parseInt(angulo / 10) + '.png';
}

function actualizarPines(){
	var nuevasAnotaciones = [];
	for (var a = 0; a < anotaciones.length; a++){
		if (anotaciones[a] != null) nuevasAnotaciones.push(anotaciones[a]);
	}
	anotaciones = nuevasAnotaciones;
	if (Titanium.Platform.osname == 'android'){
		$.mapview.removeAllAnnotations();
		$.mapview.addAnnotations(nuevasAnotaciones);
	}
	else $.mapview.annotations = nuevasAnotaciones;
}

function confirmar(){
	var addonsSolicitados = [];
	for (var c = 0; c < addons.length; c++){
		if (addons[c].activo == true) addonsSolicitados.push(addons[c].contenido.id);
	}
	codigoTiempo = new Date().getTime();
	var datosEnviar = {
		"service_id": Titanium.App.Properties.getObject('tipoServicio').id,
		"addons": addonsSolicitados,
		"user_id": Titanium.App.Properties.getInt('idUsuario'),
		"habitaciones": habitaciones,
		"banios": banos,
		"type": "lanzamiento",
		"unique_id": Titanium.App.Properties.getInt('idUsuario')+'-'+codigoTiempo,
		"latitude": Titanium.App.Properties.getDouble('latitud'),
		"longitude": Titanium.App.Properties.getDouble('longitud'),
	};
	Alloy.Globals.loading.show('Buscando...', false);
	pubnub.publish({
		channel: cCityChannel,
		message: datosEnviar,
	});
	setTimeout(function(){
		if (actual == ""){
			Alloy.Globals.loading.hide();
			enviarAviso('No se encontró personal que atienda esta solicitud');
			datosEnviar.type = "cancelada";
			pubnub.publish({
				channel: cCityChannel,
				message: datosEnviar,
			});
		}
	}, (tiempoMaximo * 1000));
	//alert (JSON.stringify(datosEnviar));
}

function masHabitaciones(){
	habitaciones ++;
	if (habitaciones >= maxHabitaciones) habitaciones = maxHabitaciones;
	calcularCosto();
}

function masBanos(){
	banos ++;
	if (banos >= maxHabitaciones) banos = maxHabitaciones;
	calcularCosto();
}

function menosHabitaciones(){
	habitaciones = habitaciones - 1;
	if (habitaciones <= 1) habitaciones = 1;
	calcularCosto();
}

function menosBanos(){
	banos = banos - 1;
	if (banos <= 0) banos = 0;
	calcularCosto();
}

function resetBaniosyHabitaciones(){
	$.selectorCantidades.bottom = 0;
	$.selectorServicio.bottom = 0;
	habitaciones = 1;
	banos = 0;
	precioRecamaras = 0.0;
	precioBanios = 0.0;
	Titanium.App.Properties.setObject('tipoServicio', null);
	$.selectorCantidades.visible = false;
	$.selectorCantidades.touchEnabled = false;
	$.txtBedrooms.text = '1';
	$.txtBathrooms.text = '0';
	$.markerLocation1.visible = true;
	$.addonsServicio.visible = false;
	$.addonsServicio.touchEnabled = false;
	calcularCosto();
}

function mostrarSolicitudesCompleto(){
	Ti.API.info(Titanium.App.Properties.getObject('tipoServicio'));
	idSolicitar = Titanium.App.Properties.getObject('tipoServicio').id;
	$.tituloServicio.text = Titanium.App.Properties.getObject('tipoServicio').name;
	$.descripcionCompleta.text = Titanium.App.Properties.getObject('tipoServicio').description;
	$.selectorCantidades.visible = true;
	$.selectorCantidades.touchEnabled = true;
	$.selectorServicio.animate(Titanium.UI.createAnimation({
		bottom: '60dp',
		duration: 310,
		autoreverse: false,
	}));
	$.selectorCantidades.animate(Titanium.UI.createAnimation({
		bottom: '140dp',
		duration: 310,
		autoreverse: false,
	}));
	calcularCosto();
	$.markerLocation1.visible = false;
	$.addonsServicio.visible = true;
	$.addonsServicio.touchEnabled = true;
	Alloy.Globals.loading.show('Cargando...', false);
	var xhr = Titanium.Network.createHTTPClient({
		onerror: function(e){
			Alloy.Globals.loading.hide();
			errorConexion(e);
		},
		onload: function(){
			Alloy.Globals.loading.hide();
			var respuesta = JSON.parse(this.responseText);
			for (var a = 0; a < addons.length; a++) $.espacioAddons.remove(addons[a]);
			addons = [];
			verifAddons = [];
			for (var b = 0; b < respuesta.length; b++){
				var espacio = Titanium.UI.createView({
					left: 0,
					right: 0,
					height: Ti.UI.SIZE,
					contenido: respuesta[b],
					activo: false,
					indice: b,
					top: '5dp',
				});
				
				var imagenAddon = Titanium.UI.createImageView({
					left: 0,
					width: '20dp',
					height: '20dp',
					backgroundColor: 'red',
					borderColor: 'black',
					borderWidth: 1,
					borderRadius: 10,
					top: 0,
					touchEnabled: false,
				});
				
				var espacioTexto = Titanium.UI.createView({
					top: 0,
					left: '35dp',
					right: 0,
					touchEnabled: false,
					layout: 'vertical',
					height: Titanium.UI.SIZE,
				});
				
				espacioTexto.add(Titanium.UI.createLabel({
					left: 0,
					right: 0,
					textAlign: 'left',
					font: {fontSize: '14dp'},
					top: 0,
					color: 'black',
					touchEnabled: false,
					text: respuesta[b].name,
				}));
				
				espacioTexto.add(Titanium.UI.createLabel({
					left: 0,
					right: 0,
					textAlign: 'left',
					font: {fontSize: '11dp'},
					top: 0,
					color: 'black',
					touchEnabled: false,
					text: respuesta[b].description,
				}));
				
				espacio.add(imagenAddon);
				espacio.add(espacioTexto);
				
				verifAddons[b] = imagenAddon;
				
				espacio.addEventListener('click', function(e){
					if (e.source.activo == true){
						e.source.activo = false;
						verifAddons[e.source.indice].backgroundColor = 'red';
					}
					else{
						e.source.activo = true;
						verifAddons[e.source.indice].backgroundColor = 'green';
					}
					calcularCosto();
				});
				
				addons[b] = espacio;
				
				$.espacioAddons.add(espacio);
			}
		}
	});
	xhr.open('GET',servidor + 'core/addons?api_token=' + Titanium.App.Properties.getString('api_token'));
	xhr.send();
}

function calcularCosto(){
	$.txtBedrooms.text = habitaciones + '';
	$.txtBathrooms.text = banos + '';
	precioRecamaras = 0.0;
	precioBanios = 0.0;
	if (Titanium.App.Properties.getObject('tipoServicio')){
		for (var a = 0; a < Titanium.App.Properties.getObject('tipoServicio').rates_bedrooms.length; a++){
			if (Titanium.App.Properties.getObject('tipoServicio').rates_bedrooms[a].quantity == parseInt($.txtBedrooms.text)) precioRecamaras = Titanium.App.Properties.getObject('tipoServicio').rates_bedrooms[a].quantity * parseFloat(Titanium.App.Properties.getObject('tipoServicio').rates_bedrooms[a].price);
		}
		for (var b = 0; b < Titanium.App.Properties.getObject('tipoServicio').rates_bathrooms.length; b++){
			if (Titanium.App.Properties.getObject('tipoServicio').rates_bathrooms[b].quantity == parseInt($.txtBathrooms.text)){
				precioBanios = Titanium.App.Properties.getObject('tipoServicio').rates_bathrooms[b].quantity * parseFloat(Titanium.App.Properties.getObject('tipoServicio').rates_bathrooms[b].price);
				Ti.API.info(Titanium.App.Properties.getObject('tipoServicio').rates_bathrooms[b]);
			}
		}
	}
	precioAddons = 0.0;
	for (var c = 0; c < addons.length; c++){
		if (addons[c].activo == true) precioAddons = precioAddons + parseFloat(addons[c].contenido.price);
	}
	subtotal = precioRecamaras + precioBanios + precioAddons;
	$.costoPrevio.text = numeral(subtotal).format('$ 0,000,000.00');
}

function tarifaEspecifica(boton){
	Alloy.Globals.loading.show('Cargando...', false);
	var xhr = Titanium.Network.createHTTPClient({
		onerror: function(e){
			Alloy.Globals.loading.hide();
			errorConexion(e);
		},
		onload: function(){
			Alloy.Globals.loading.hide();
			var respuesta = JSON.parse(this.responseText);
			boton.contenido = respuesta;
			Titanium.App.Properties.setObject('tipoServicio', respuesta);
			mostrarSolicitudesCompleto();
		}
	});
	xhr.open('GET', servidor + 'core/services/' + boton.contenido.id + '?api_token=' + Titanium.App.Properties.getString('api_token'));
	xhr.send();
}

function cargarTarifas(){
	Alloy.Globals.loading.show('Cargando...', false);
	var xhr = Titanium.Network.createHTTPClient({
		onerror: function(e){
			Alloy.Globals.loading.hide();
			errorConexion(e);
		},
		onload: function(){
			Alloy.Globals.loading.hide();
			var respuesta = JSON.parse(this.responseText);
			for (var a = 0; a < respuesta.length; a++){
				var botonServicio = Titanium.UI.createButton({
					left: '10dp',
					backgroundColor: 'blue',
					height: '60dp',
					width: '60dp',
					color: 'white',
					font: {fontSize: '12dp'},
					title: respuesta[a].name,
					contenido: respuesta[a],
					borderRadius: 30,
					borderWidth: 3,
					borderColor: '#c1c1c1',
					textAlign: 'center',
				});
				
				botonServicio.addEventListener('click', function(e){
					tarifaEspecifica(e.source);
				});
				
				$.botoneraServicios.add(botonServicio);
			}
			$.botoneraServicios.add(Titanium.UI.createImageView({
				left: '10dp',
				width: 1,
				height: 1,
				touchEnabled: false,
			}));
		}
	});
	xhr.open('GET', servidor + 'core/services?api_token=' + Titanium.App.Properties.getString('api_token'));
	Ti.API.info(servidor + 'core/services?api_token=' + Titanium.App.Properties.getString('api_token'));
	xhr.send();
}

function procesarCambiosRegion(e){
	Titanium.App.Properties.setDouble('latitud', e.latitude);
	Titanium.App.Properties.setDouble('longitud', e.longitude);
	solicitarInfo();
}

function solicitarInfo(){
	var xhr = Titanium.Network.createHTTPClient({
		onerror: function(e){
			Ti.API.info(JSON.stringify(e));
		},
		onload: function(){
			var respuestaGoogle = JSON.parse(this.responseText);
			if (respuestaGoogle.results && respuestaGoogle.results.length){
				var canalNuevo = '';
				for (var a = 0; a < respuestaGoogle.results[0].address_components.length; a++){
					if (respuestaGoogle.results[0].address_components[a].types[0] == "locality") canalNuevo = respuestaGoogle.results[0].address_components[a].short_name;
				}
				if (canalNuevo != '') cambiarCanal(canalNuevo);
				else cambiarCanal(null);
				$.markerLocation1.text = respuestaGoogle.results[0].formatted_address;
			}
			else {
				$.markerLocation1.text = "No address found";
				cambiarCanal(null);
			}
		}
	});
	xhr.open('GET','http://maps.googleapis.com/maps/api/geocode/json?latlng=' + Titanium.App.Properties.getDouble('latitud') +',' + Titanium.App.Properties.getDouble('longitud') + protocoloGoogleMaps);
	xhr.send();
}

actualizarPines();
cargarTarifas();

if (Ti.Geolocation.locationServicesEnabled) geolocalizacionActivada();
else if (Titanium.Platform.osname == 'android'){
	var hasLocationPermissions = Ti.Geolocation.hasLocationPermissions(Ti.Geolocation.AUTHORIZATION_ALWAYS);
	if (hasLocationPermissions) geolocalizacionActivada();
	Ti.Geolocation.requestLocationPermissions(Ti.Geolocation.AUTHORIZATION_ALWAYS, function(e) {
		if (e.success) geolocalizacionActivada();
		else avisoGPS.show();
	});
}
else avisoGPS.show();

function geolocalizacionActivada(){
	Ti.Geolocation.getCurrentPosition(function(e){
		if (e.error){
			Ti.API.info(JSON.stringify(e));
		}
		else if (e.success && e.coords){
			Titanium.App.Properties.setDouble('latitud',e.coords.latitude);
			Titanium.App.Properties.setDouble('longitud', e.coords.longitude);
			$.mapview.region = {
				latitudeDelta: 0.001,
		    	longitudeDelta: 0.001,
		    	latitude: Titanium.App.Properties.getDouble('latitud'),
		    	longitude: Titanium.App.Properties.getDouble('longitud'),
			};
			solicitarInfo();
		}
	});
}
