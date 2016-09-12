module.exports = {
	
	onDuty: function () {
		// Update Time
		var dUpdateTime = new Date();
		
		// Giving the vehicle status
		// pubnub.subscribe({
		  // channel: 'vehicle_status',
		  // message: function (message) {
		    // // App code...
		  // },
		  // metadata: {
		    // vehicle_id: Alloy.Globals.nUUID,
		    // state: {
		      // type: "onDuty",
		      // time: dUpdateTime
		    // }
		  // }
		// });
	},
	offDuty: function () {
		// Update Time
		var dUpdateTime = new Date();
			
		// Giving the vehicle status
		// pubnub.unsubscribe({
		  // channel: 'vehicle_status',
		  // message: function (message) {
		    // // App code...
		  // },
		  // metadata: {
		    // vehicle_id: Alloy.Globals.nUUID,
		    // state: {
		      // type: "offDuty",
		      // time: dUpdateTime
		    // }
		  // }
		// });
	},
	updateMarkers: function() {

	},
	getMarker: function(nDegrees, nType) {
		var cCarTypeAndroid = '';
		var cCarTypeIOS = '';
		
		if (nType=='1'){
			cCarTypeAndroid = "/images/car1.png";
			cCarTypeIOS = "markers/car1.png";	
		}
		if (nType=='2'){
			cCarTypeAndroid = "/images/car2.png";
			cCarTypeIOS = "markers/car2.png";
		}
		
		if (Titanium.Platform.name == 'android') {
			var view = Ti.UI.createView({
				width: 20,
				height: 40,
				backgroundImage: cCarTypeAndroid,
			});
		}
		
		if (Titanium.Platform.name == 'iPhone OS') {
			var view = Ti.UI.createView({
				width: 20,
				height: 40,
				backgroundImage: cCarTypeIOS,
			});
		} 
		 
		// setup rotate transform matrix
	  	var t3 = Ti.UI.create2DMatrix();
	  	t3 = t3.rotate(34);
	  
	  	var a = Ti.UI.createAnimation({
	    	transform: t3,
	      	duration: 1
	  	});
	  	
	  	view.animate(a);
	  	
	  	var container = Ti.UI.createView({
		      width: 50,
		      height: 50,
		});
		container.add(view);
	  	
		return container;
		
	},
	getCarMarker: function(nDegrees, nType) {
		var cCarTypeAndroid = '';
		var cCarTypeIOS = '';
		
		if (nType=='1'){
			cCarTypeAndroid = "/images/car1.png";
			cCarTypeIOS = "markers/car1.png";	
		}
		if (nType=='2'){
			cCarTypeAndroid = "/images/car2.png";
			cCarTypeIOS = "markers/car2.png";
		}
		
		if (Titanium.Platform.name == 'android') {
			//load test image from the appcelerator web site
			var img = Titanium.UI.createImageView({
			    image : cCarTypeAndroid,
			    backgroundColor : 'transparent',
			    anchorPoint : {
			        x : '0.5',
			        y : '0.5'
			    },
			    height : 40,
			    width : 20
			});
		}
		
		if (Titanium.Platform.name == 'iPhone OS') {
			//load test image from the appcelerator web site
			var img = Titanium.UI.createImageView({
			    image : cCarTypeIOS,
			    backgroundColor : 'transparent',
			    anchorPoint : {
			        x : '0.5',
			        y : '0.5'
			    },
			    height : 40,
			    width : 20
			});
		}
		
		// Spin the image
		var matrix2d = Ti.UI.create2DMatrix();
		matrix2d = matrix2d.rotate(12); // in degrees
		// matrix2d = matrix2d.scale(1.5); // scale to 1.5 times original size
		var a = Ti.UI.createAnimation({
		    transform: matrix2d,
		    duration: 1
		});
		
		var viewMarker = Ti.UI.createView({
			width: 20,
			height: 40,
		});
		
		img.animate(a);
		a.addEventListener('complete',function(){
			viewMarker.add(img);
		});
		
		return viewMarker;

	},
	locationSearch: function() {
		Alloy.Globals.mainDrawer.openWindow(Alloy.createController('locationSearch').getView());
	},	
};


