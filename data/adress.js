/* Function for search, with this we can start writing and the timer gives some time to the autosearch to look for what we are writing, to improve the performance of the page */
function debounce(func, delay) {
    let timer;
    return function (...args){
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/* Instance to start the Vue app */
const app = Vue.createApp({
    data() {
        return{
            /* Empty array for the addresses that we will fetch from the Json file */
            address : [],
            /* Here we prepare an empty string for the search bar */
            searchQuery : '',
            /* with this boolean we filter the addresses when we search */
            filteredAddress : null,            
            isClicked : false,
            selectedMarkerDetails: null,
            isFiltering : false,
            selectedAddressIndex: null,
            autocompleteSuggestions: [],
            highlightedSuggestionIndex: -1,
            cachedCoordinates: [], 
            townMarkers: {}
        }
    },

    async created() {   
        /* starting the instance for the search bar, to create the delay when we search */      
        this.debouncedSearchAddress = debounce(this.searchAddress, 300);
        /* we fetch the addresses directly at the start of the page, to do only one request and improve the performance of the page */
        this.fetchAddress();  
    },

    methods: {
        /* function to fetch the addresses */
        async fetchAddress() {
            try {
                const response = await axios.get("./data/address.json");
                /* function to sort the addresses by Region */
                this.address = response.data.sort((a,b) => a.region.localeCompare(b.region));
                /* calling the function to show all the addresses on the map upon the start of the page */
                this.showAllAddressOnMap();
            }
            catch(error){
                console.error('Error fetching data: ', error);
            }
        },

        /* function with the API to convert addresses to geo coordinates, which is needed to show on the map */
        async getCoordinatesFromAddress(address){
            /* creation of the query for the request with the data fetched from the Json file */
            const query = `${address.nmb} ${address.street}, ${address.town}, ${address.country}`;
            /* APIKey */
            const APIKey = '678zEXbPdEgOCDddWd8XHWqDW4obzXXi';

            /* here is where we store the coordinates, so that the page doesn't need to do more than one request once we reset the map, so like this, the request is made at the beginning of the page and then it doesn't do any request anymore */
            if(this.cachedCoordinates[query]){
                return this.cachedCoordinates[query];
            }

            /* the url for the request of converting addresses to geo coordinates, we need to give the APIKey and the location, which in this case is our "query" */
            const apiUrl = `https://www.mapquestapi.com/geocoding/v1/address?key=${APIKey}&location=${encodeURIComponent(query)}`;

            try {
                /* here we use Axios library to get the data from the request, is faster and more reliable */
                const response = await axios.get(apiUrl);
                
                /* if there's any "data" we start creating an array with the coordinates, latitude and longitude */
                if (response.data.results.length > 0) {
                    const coordinates = response.data.results[0].locations[0].latLng;
                    this.cachedCoordinates[query] = [coordinates.lat, coordinates.lng];
                    return [coordinates.lat, coordinates.lng];
                } else {
                    console.error('No coordinates found!');
                    return null;
                }
            } catch (error) {
                console.error('Error fetching coordinates:', error);
                return null;
            }

            /*****NOMATIM API******/
            //const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

            /*try{
                this.isLoading = true;
                const response = await axios.get(apiUrl);
                if (response.data && response.data.length > 0){
                    const latitude = parseFloat(response.data[0].lat);
                    const longitude = parseFloat(response.data[0].lon);
                    const coordinates = [latitude, longitude];

                    this.cachedCoordinates[query] = coordinates;
                    return coordinates;
                }
                else{
                    console.error('No coordinates found!')
                    return null;
                }
            }
            catch (error){
                console.error("Error fetching coordinates:", error);
                return null;
            }*/
        },
        
        /* this function is to highlight a marker when we click on a card with a specific address */
        async showAddressOnMap(address, index){
            /* let's clear the map first */
            map.eachLayer(function(layer){
                if(!!layer.toGeoJSON){
                    map.removeLayer(layer)
                }
            });

            /* the constant to store the addresses near the one we choose */
            const markersForTown = this.townMarkers[address.town];

            if (markersForTown) {
                markersForTown.forEach(marker => {
                    map.addLayer(marker);
                });
            }

            const coordinates = await this.getCoordinatesFromAddress(address);
            
            if(coordinates){
                const [lat, lng] = coordinates;
                const marker = L.marker([lat, lng]).addTo(map);       
                /* here we change the color of the marker when we click on the card */         
                marker._icon.classList.add("huechange");
                /* here we put the specific marker in front */
                marker.setZIndexOffset(1000);
                /* here we create a cool pop-up for the marker, with the details, the link for the details page and a picture */
                 marker.bindPopup(`<b>${address.town}</b><br>${address.nmb}, ${address.street}, ${address.region}<br>${address.country}<br><img src="${address.img}" style=" width:150px; height:100px"><br>` + '<a href="details.html">Click here for details</a>');

                /* setting the view port and also activating the reset button, by setting the boolean "isClicked" to true */
                map.setView([lat,lng], 12);
                this.isClicked = true;

                /* here all the functions when we click on a marker : 
                    -the programm collects the index of the card and the highlight it and scroll to it
                    -the reset button is on
                    -store the details data for the new page */
                marker.on('click', () => {
                    this.selectedAddressIndex = index;
                    this.isClicked = true;
                    this.selectedMarkerDetails = index;
                    this.scrollToSelectedCard(index);

                    localStorage.setItem('selectedAddress', JSON.stringify(address));
                })

                marker.on('popupclose', () => {
                    this.selectedAddressIndex = null;
                    this.selectedMarkerDetails = null;
                })

            }           
        },

        /* function to show all addresses on the map when the page is loaded */
        async showAllAddressOnMap(){
            map.eachLayer(function(layer){
                if(!!layer.toGeoJSON){
                    map.removeLayer(layer)
                }
            });

            this.townMarkers = {};
            
            for (const [index, add] of this.address.entries()) {
                const coordinates = await this.getCoordinatesFromAddress(add);
                if(coordinates) {
                    const [lat, lng] = coordinates;
                    const marker = L.marker([lat, lng]).addTo(map);
                    marker.bindPopup(`<b>${add.town}</b><br>${add.nmb}, ${add.street}, ${add.region}<br>${add.country}<br><img src="${add.img}" style=" width:150px; height:100px"><br>` + '<a href="details.html">Click here for details</a>')

                    if(!this.townMarkers[add.town]){
                        this.townMarkers[add.town] = [];
                    }
                    this.townMarkers[add.town].push(marker);

                    marker.on('click', () => {
                        this.selectedAddressIndex = index;
                        this.isClicked = true;       
                        this.selectedMarkerDetails = index;
                        this.scrollToSelectedCard(index);   
                        localStorage.setItem('selectedAddress', JSON.stringify(add));

                    })
    
                    marker.on('popupclose', () => {
                        this.selectedAddressIndex = null;
                        this.selectedMarkerDetails = null;
                    })
                    
                }
            }

        },

        /* function to scroll to card when clicking on marker from the corresponding marker */
        scrollToSelectedCard(index) {
                const selectedCard = this.$refs.addressList.getElementsByClassName('address-card')[index];
                if(selectedCard){
                    selectedCard.scrollIntoView({
                        behavior: 'smooth', 
                        block: 'start' });
                }
        },
        
        /* search bar function */
        async searchAddress() {
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const foundAddress = this.address.find(add =>
                    add.town.toLowerCase().includes(query) ||
                    add.nmb.toString().includes(query) ||
                    add.street.toLowerCase().includes(query) ||
                    add.region.toLowerCase().includes(query) ||
                    add.country.toLowerCase().includes(query),

                    this.autocompleteSuggestions = this.address.filter(add => 
                        add.town.toLowerCase().includes(this.searchQuery.toLowerCase()))
                );
                if (foundAddress) {
                    await this.showAddressOnMap(foundAddress);
                    this.filteredAddress = foundAddress;
                    this.isFiltering = true;
                } else {
                    this.filteredAddress = null;
                    this.isFiltering = false;
                }
            } else {
                this.filteredAddress = null;
                this.isFiltering = false;
                this.showAllAddressOnMap();
            }
        },

        focusSearchInput() {
            this.$refs.searchInput.focus();
        },

        autocompleteSuggestionClicked(suggestion, index) {
            this.selectedAddressIndex = index;
            this.searchQuery = suggestion.town, suggestion.nmb, suggestion.street;
            this.autocompleteSuggestions = [];
            this.showAddressOnMap(suggestion);
            this.focusSearchInput();
        },

        highlightNextSuggestion() {
            console.log("Here");
            this.highlightedSuggestionIndex =
                (this.highlightedSuggestionIndex + 1) % this.autocompleteSuggestions.length;
            this.scrollToHighlightedSuggestion();
        },

        highlightPreviousSuggestion() {
            this.highlightedSuggestionIndex =
                (this.highlightedSuggestionIndex - 1 + this.autocompleteSuggestions.length) %
                this.autocompleteSuggestions.length;
            this.scrollToHighlightedSuggestion
        },

        scrollToHighlightedSuggestion() {
            if (this.highlightedSuggestionIndex >= 0) {
                this.autocompleteSuggestionClicked(
                    this.autocompleteSuggestions[this.highlightedSuggestionIndex]
                );
            }
        },

        /* function when clicking on reset button */
        showAllandReset() {
            this.searchQuery = ''; 
            this.filteredAddress = null; 
            this.showAllAddressOnMap(); 
            map.setView([49.79982449560871, 6.076788757795374], 9);
            this.isClicked = false; 
            this.selectedAddressIndex = null;
        },

        toggleFiltering() {
            if(this.isFiltering){
                this.isFiltering = false;               
                this.showAllAddressOnMap();
                map.setView([49.79982449560871, 6.076788757795374], 9);
            }
        }
    }
    
})

app.mount('#app')