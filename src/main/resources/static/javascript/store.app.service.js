(function() {
  storeApp.factory('dataProvider', function($http) {
    return {
      loadData: function(callback, url) {
        $http.get(encodeURI(url))
            .then(callback, function(response) {
              console.log('Error in dataProvider; response: ', response);
            });
      },
    }
  });

})();