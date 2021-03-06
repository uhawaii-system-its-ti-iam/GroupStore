(function() {

  StoreController.$inject = ['$scope', '$uibModal', 'CartService', 'dataProvider', 'FILTER_OPTIONS', 'STORE_HOME'];

  function StoreController($scope, $uibModal, CartService, dataProvider, FILTER_OPTIONS, STORE_HOME) {

    /** User's current location */
    var currentLocation;

    /** Name of the folder the user is currently in */
    $scope.currentFolder;
    /** The folders and groups that are displayed on the table */
    $scope.itemsInCurrentLocation;

    /** The filters available for use by the user on the left side of the page */
    $scope.availableFilters;
    /** The filters selected by the user */
    $scope.filtersSelected;

    /** Whether the user is browsing through the store, or is using the search bar/filters */
    $scope.isBrowsing;

    /** User's input into the search bar when searching for groups */
    $scope.searchQuery;
    /** User's query when executing a search */
    $scope.queryEntered;

    /** Whether or not to show the loading spinner when performing asynchronous requests */
    $scope.loading;

    /** Used for displaying alerts for various errors */
    $scope.errorMessages = {
      notEnoughCharacters: false,
      noResultsFound: false,
    };

    // $scope.filterTree = [];

    /**
     * Initialization of Group Store UI. Moves the user to the home directory.
     */
    $scope.init = function() {
      // Load the groups in the cart from a previous session (if any)
      CartService.loadCart();
      $scope.isBrowsing = true;
      // Move the user to the Group Store home directory
      $scope.goToLocation(STORE_HOME);
      $scope.buildFilterTree();
    };

    /**
     * Moves the user to the new location specified.
     * @param {string} location - the path to move to
     */
    $scope.goToLocation = function(location) {
      currentLocation = location;
      $scope.isBrowsing = true;
      $scope.updateCurrentFolder();
      // Clear the items in the table, then load the new folders and groups
      $scope.itemsInCurrentLocation = [];
      $scope.loadItemsInLocation(currentLocation);
    };

    /**
     * Moves the user back one folder.
     */
    $scope.moveBackOneFolder = function() {
      // Previous folder is defined as everything before the last ':'
      var previousFolder = currentLocation.substr(0, currentLocation.lastIndexOf(':'));
      $scope.goToLocation(previousFolder);
    };

    /**
     * Builds the breadcrumb navigation.
     * @example If the user's current path is 'hawaii.edu:store:rcuh:aff', the breadcrumb will be built as
     * ['hawaii.edu:store', 'rcuh', 'aff'].
     * @returns {string[]} the current path of the user, separated by the ':' character.
     */
    $scope.buildBreadcrumb = function() {
      var breadcrumb = currentLocation.split(':');
      // Combines 'hawaii.edu' and 'store' into one breadcrumb navigator to prevent users from going to a location
      // outside of the store
      breadcrumb.shift();
      breadcrumb[0] = STORE_HOME;
      return breadcrumb;
    };

    /**
     * Moves the user to the new path when clicking on a breadcrumb navigator.
     * @param {number} index - the index of the breadcrumb clicked by the user
     */
    $scope.moveToBreadcrumbIndex = function(index) {
      var pathArray = currentLocation.split(':');
      // To include the folder the user clicked on, and to account for 'hawaii.edu' and 'store' being combined in the
      // breadcrumb as index 0, add 2 to the index clicked on to extract the new path
      pathArray = pathArray.slice(0, index + 2);
      var newPath = pathArray.join(':');
      $scope.goToLocation(newPath);
    };

    /**
     * Loads the stems/folders and groups in a specific path.
     * @param {string} path - the path to load the items
     */
    $scope.loadItemsInLocation = function(path) {
      var stemsUrl = encodeURI('/store/api/stems/children/' + path + '/');
      var groupsUrl = encodeURI('/store/api/groups/path/' + path + '/');
      $scope.loading = true;
      // Load stems/folders
      dataProvider.loadData(function(d) {
        var data = d.data;
        data.forEach(function (item) {
          // Attach a 'type' property with the value of 'stem' to differentiate these with groups
          item.type = 'stem';
          $scope.itemsInCurrentLocation.push(item);
        });
      }, stemsUrl)
          .then(function() {
            dataProvider.loadData(function(d) {
              var data = d.data;
              data.forEach(function(item) {
                // Attach a 'type' property with the value of 'group' to differentiate these with stems/folders
                item.type = 'group';
                $scope.itemsInCurrentLocation.push(item);
              });
            }, groupsUrl);
          })
          .finally(function() {
            $scope.loading = false;
          });
    };

    /**
     * Checks if the user is at the home directory (hawaii.edu:store).
     * @returns {boolean} true if the user is at the home directory, otherwise returns false
     */
    $scope.isUserAtHome = function() {
      return currentLocation === STORE_HOME;
    };

    /**
     * Updates the header text that says the user's current folder name.
     */
    $scope.updateCurrentFolder = function() {
      // The folder name is defined as everything after the last ':' delimiter
      $scope.currentFolder = currentLocation.slice(currentLocation.lastIndexOf(':') + 1, currentLocation.length);
    };

    /**
     * Adds a group to the user's cart.
     * @param {object} group - the group to add
     */
    $scope.addToCart = function(group) {
      CartService.addToCart(group.name);
    };

    /**
     * Removes the specified group from the cart.
     * @param {object} group - the group to remove
     */
    $scope.removeFromCart = function(group) {
      CartService.removeFromCart(group);
    };

    /**
     * @returns {number} the number of groups in the user's cart
     */
    $scope.getAmountInCart = function() {
      return CartService.getAmountInCart();
    };

    /**
     * @returns {object[]} an array of groups in the user's cart
     */
    $scope.getGroupsInCart = function() {
      return CartService.getGroupsInCart();
    };

    /**
     * Searches for groups matching the query entered by the user in the search bar, then loads them for display onto
     * the table.
     */
    $scope.searchForGroups = function() {
      // Display an alert if user enters a query that is less than 3 characters
      if (!$scope.searchQuery || $scope.searchQuery.length < 3) {
        $scope.errorMessages.notEnoughCharacters = true;
      } else {
        // Store the query entered in case no results are found
        $scope.queryEntered = $scope.searchQuery;
        $scope.closeErrorMessages();
        $scope.loading = true;
        var groupsUrl = encodeURI('/store/api/groups/name/' + $scope.searchQuery + '/');
        dataProvider.loadData(function (d) {
          var data = d.data;
          // Results were found, so load them onto the table and display it
          if (data.length > 0) {
            $scope.itemsInCurrentLocation = [];
            data.forEach(function (item) {
              item.type = 'group';
              $scope.itemsInCurrentLocation.push(item);
            });
            // Toggle the mode to show the path column, allowing users to know what path the group was found in
            $scope.isBrowsing = false;
          } else {
            // Otherwise display an alert saying no results were found
            $scope.errorMessages.noResultsFound = true;
          }
        }, groupsUrl)
            .finally(function() {
              $scope.loading = false;
            });
      }
    };

    /**
     * Allows the users to re-browse through the store. It will load the items at the user's location prior to
     * searching/applying filters.
     */
    $scope.reset = function() {
      $scope.goToLocation(currentLocation);
    };

    /**
     * Opens a modal that allows users to select how they want to configure their groups in their cart.
     */
    $scope.openGroupConfiguration = function() {
      var modal = $uibModal.open({
        ariaLabelledBy: 'modal-title',
        ariaDescribedBy: 'modal-body',
        templateUrl: 'group-configuration',
        controller: 'GroupConfigurationController',
        size: 'lg'
      });

      modal.result.catch(function() {
        modal.close();
      });
    };

    // $scope.buildFilters = function() {
    //   var filters = [];
    //   var stack = [];
    //   stack.push(STORE_HOME);
    //   buildFilterHelper(stack, filters);
    // };
    //
    // function buildFilterHelper(stack, filters) {
    //   if (stack.length > 0) {
    //     var folderToCheck = stack.shift();
    //     folderToCheck = typeof folderToCheck === 'string' ? folderToCheck : folderToCheck.name;
    //     if (folderToCheck.split(':').length >= 7) {
    //       filters.push(folderToCheck.split(':').slice(0, 5).join(':'));
    //       stack = stack.filter(function(folder) {
    //         return !folder.name.startsWith(folderToCheck.split(':').slice(0, 5).join(':'));
    //       });
    //       buildFilterHelper(stack, filters);
    //     }
    //     var stemsUrl = encodeURI('/store/api/stems/children/' + folderToCheck + '/');
    //     dataProvider.loadData(function(d) {
    //       var data = d.data;
    //       if (data.length > 0 && folderToCheck.split(':').length < 7) {
    //         data.forEach(function(folder) {
    //           stack.unshift(folder);
    //         });
    //         buildFilterHelper(stack, filters);
    //       } else if (data.length === 0 && folderToCheck.split(':').length < 7) {
    //           filters.push(folderToCheck.split(':').slice(0, 4).join(':'));
    //           stack = stack.filter(function(folder) {
    //             return !folder.name.startsWith(folderToCheck.split(':').slice(0, 5).join(':'));
    //           });
    //           buildFilterHelper(stack, filters);
    //         }
    //       }, stemsUrl);
    //   } else {
    //     return _.uniq(filters).reverse();
    //   }
    // }
    //
    // function buildTree(filters) {
    //   filters.forEach(function(filter) {
    //     var splitFilter = filter.split(':');
    //     splitFilter.splice(0, 2);
    //     var current = $scope.filterTree;
    //     // Iterate through each folder of the filter path
    //     for (var i = 0; i < splitFilter.length; i++) {
    //       var folder = _.find(current, { text: splitFilter[i] });
    //       if (!!folder) {
    //         // Add a 'nodes' property if it doesn't have one already to traverse 1 level deeper
    //         if (!folder.nodes) {
    //           folder.nodes = [];
    //         }
    //         // Move down 1 level deeper
    //         current = folder.nodes;
    //       } else {
    //         var newFolder = { text: splitFilter[i], path: STORE_HOME.concat(':', splitFilter.slice(0, i + 1).join(':')) };
    //         // Ensure that only non-leaves have a 'nodes' property
    //         if (i !== splitFilter.length - 1) {
    //           newFolder.nodes = [];
    //         }
    //         current.push(newFolder);
    //         // Move down 1 level deeper
    //         current = newFolder.nodes;
    //       }
    //     }
    //   });
    //   console.log($scope.filterTree);
    // }

    /**
     * Returns the name of the group (everything after the last semicolon (':') when passed in the group's full path).
     * @param {string} group - the full path of the group
     * @returns {string} the name of the group
     */
    $scope.getGroupName = function(group) {
      var lastSemicolonPosition = group.lastIndexOf(':');
      return group.substring(lastSemicolonPosition + 1, group.length);
    };

    /**
     * Gets the location of an item in the store given its path.
     * @example the item 'hawaii.edu:store:any-dataOrigin:aff:any-org:casual ' is located in
     * 'hawaii.edu:store:any-dataOrigin:aff:any-org'
     * @param {string} path - the full path of the item
     * @returns {string} the location of the item
     */
    $scope.getLocationOfItem = function(path) {
      return path.substring(0, path.lastIndexOf(':'));
    };

    /**
     * Closes all error message alerts.
     */
    $scope.closeErrorMessages = function() {
      _.forOwn($scope.errorMessages, function(_, key) {
        $scope.errorMessages[key] = false;
      });
    };

    /**
     * Creates the filter tree to the left of the store.
     */
    $scope.buildFilterTree = function() {
      $('#filter-tree').treeview({
        data: FILTER_OPTIONS,
        highlightSelected: false,
        levels: 1,
        showBorder: false,
        showCheckbox: true
      });
    };

    /**
     * Applies the filters checked by the user and loads the items into the table.
     */
    $scope.applyFilters = function() {
      var checkedFilters = $('#filter-tree').treeview('getChecked');
      if (checkedFilters.length > 0) {
        $scope.itemsInCurrentLocation = [];
        $scope.isBrowsing = false;
        checkedFilters.forEach(function(item) {
          $scope.loadItemsInLocation(item.path);
        });
      }
    };

    /**
     * Unchecks the filters selected by the user.
     */
    $scope.clearFilters = function() {
      $('#filter-tree').treeview('uncheckAll');
    };

  }
  storeApp.controller('StoreController', StoreController);

})();
