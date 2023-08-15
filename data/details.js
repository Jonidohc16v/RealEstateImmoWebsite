const app = Vue.createApp({
    data() {
        return {
            selectedAddress: {}
        };
    },

    /*here we collect and show the data from the previous page on this new page */
    created() {
        const data = localStorage.getItem('selectedAddress');
        if (data) {
            this.selectedAddress = JSON.parse(data);
        } else {
            console.error("No address data found");
        }
    }
});

app.mount('#detailsApp');
