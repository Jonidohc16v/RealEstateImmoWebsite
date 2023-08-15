function debounce(func, delay) {
    let timer;
    return function (...args){
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

const app = Vue.createApp({
    data() {
        return{
            address : [],
            searchQuery : '',
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
        this.debouncedSearchAddress = debounce(this.searchAddress, 300);
        this.fetchAddress();  
    },

    methods: {
        async fetchAddress() {
            try {
                const response = await axios.get("./data/address.json");
                this.address = response.data.sort((a,b) => a.region.localeCompare(b.region));
                this.showAllAddressOnMap();
            }
            catch(error){
                console.error('Error fetching data: ', error);
            }
        },
        async getCoordinatesFromAddress(address){
            const query = `${address.nmb} ${address.street}, ${address.town}, ${address.country}`;
            const APIKey = '678zEXbPdEgOCDddWd8XHWqDW4obzXXi';
            if(this.cachedCoordinates[query]){
                return this.cachedCoordinates[query];
            }

            const apiUrl = `https://www.mapquestapi.com/geocoding/v1/address?key=${APIKey}&location=${encodeURIComponent(query)}`;

            try {
                const response = await axios.get(apiUrl);
        
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
        
        async showAddressOnMap(address, index){
            map.eachLayer(function(layer){
                if(!!layer.toGeoJSON){
                    map.removeLayer(layer)
                }
            });

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
                marker._icon.classList.add("huechange");
                marker.setZIndexOffset(1000);
                 marker.bindPopup(`<b>${address.town}</b><br>${address.nmb}, ${address.street}, ${address.region}<br>${address.country}<br><img src="${address.img}" style=" width:150px; height:100px"><br>` + '<a href="details.html">Click here for details</a>');

                map.setView([lat,lng], 12);
                this.isClicked = true;

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

        scrollToSelectedCard(index) {
                const selectedCard = this.$refs.addressList.getElementsByClassName('address-card')[index];
                if(selectedCard){
                    selectedCard.scrollIntoView({
                        behavior: 'smooth', 
                        block: 'start' });
                }
        },
        
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