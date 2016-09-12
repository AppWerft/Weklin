function onMenuButtonClick(){
    $.home.toggleLeftView();
}

function logOut() {
	Titanium.App.Properties.setString('correo', '');
	Titanium.App.Properties.setString('password', '');
	if (Titanium.Platform.osname == 'android')  Titanium.Android.currentActivity.finish();
	else $.home.close();
}

$.menuC.on('menuclick',function(e){
    $.home.toggleLeftView({animated:false});
    $.home.setCenterView(Alloy.createController(e.itemId).getView());
    /*
    switch(e.itemId){
    	case 'amenities':
      		$.home.title = "Amenidades";
        	$.home.openWindow(Alloy.createController(e.itemId).getView());
      	break;
      	
      	case 'booking':
      		$.home.title = "Reservaciones";
      		$.home.openWindow(Alloy.createController(e.itemId).getView());
      	break;
      	
      	default:
        	$.home.setCenterView(Alloy.createController(e.itemId).getView()); //Arg shold be View(not window)
      	break;
    }
    */
});
