define([], function () {
    'use strict';
     var url = "http://localhost:8080/api/comments/";
  
    return {
        write: function(data, callback) {
			$.ajax({
				url: url,
				type: 'POST',
				crossDomain: true,
				data: data,
				success: callback,
				error: function(jqXHR, textStatus, errorThrown) { console.error(textStatus + ' - ' + errorThrown ); }
			});
		},
	    read: function(key, callback) {
			$.ajax({
				url: url + key,
				type: 'get',
				crossDomain: true,
				success: callback,
				error: function(jqXHR, textStatus, errorThrown) { console.error(textStatus + ' - ' + errorThrown ); }
			});
		},
	    delete: function(key, callback) {
			$.ajax({
				url: url + key,
				type: 'delete',
				crossDomain: true,
				success: callback,
				error: function(jqXHR, textStatus, errorThrown) { console.error(textStatus + ' - ' + errorThrown ); }
			});
		},
       
    };
});