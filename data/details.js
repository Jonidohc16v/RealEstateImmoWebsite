const app = Vue.createApp({
    data() {
        return {
            selectedAddress: {}
        };
    },

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
