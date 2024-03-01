document.addEventListener('DOMContentLoaded', function () {
    const categorySelect = document.getElementById('categorySelect');
    const subcategorySelect = document.getElementById('subcategorySelect');
    const variableSelect = document.getElementById('variableSelect');
    const submitBtn = document.getElementById('submitBtn');
    let data; // Holds the variables JSON data
    let currentLayers = {}; // Object to store current GeoJSON layers
    let init = true;
    let colorScale;
    let breaks;
    let selectedVariable = '';
    let selectedVariableName = '';

    // Initializes with submit button disabled
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.disabled = true;

    async function loadVariables() {
        try {
            const response = await fetch('data/acsVariables.json');
            data = await response.json();
            populateCategories();
        } catch (error) {
            console.error("Failed to load variables:", error);
        }
    }

    function populateCategories() {
        Object.keys(data).forEach(category => {
            if (category === "_reference") return;
            const option = createOptionElement(category, category);
            categorySelect.appendChild(option);
        });
        updateSubcategories();
    }

    function updateSubcategories() {
        const selectedCategory = categorySelect.value;
        const subcategories = Object.keys(data[selectedCategory]);
        subcategorySelect.innerHTML = '';
        subcategories.forEach(subcategory => {
            let option = document.createElement('option');
            option.value = subcategory;
            option.textContent = subcategory;
            subcategorySelect.appendChild(option);
        });
        updateVariables();
    }

    function updateVariables() {
        const selectedCategory = categorySelect.value;
        const selectedSubcategory = subcategorySelect.value;
        const variables = data[selectedCategory][selectedSubcategory].variables;
        variableSelect.innerHTML = '';
        Object.entries(variables).forEach(([humanReadableName, details]) => {
            let option = document.createElement('option');
            option.value = details.code;
            option.textContent = humanReadableName;
            variableSelect.appendChild(option);
        });
        if (init) {
            variableSelect.options[0].classList.add('border-2', 'border-blue-500', 'shadow-lg');
        } else {
            variableSelect.options[0].classList.remove('border-2', 'border-blue-500', 'shadow-lg');
        }
        checkVariableSelection();
    }


    function checkVariableSelection() {
        const isSelected = variableSelect.selectedOptions.length > 0;
        submitBtn.disabled = !isSelected;
        submitBtn.classList.toggle('opacity-50', !isSelected);
        submitBtn.classList.toggle('cursor-not-allowed', !isSelected);
        variableSelect.options[0].classList.remove('border-2', 'border-blue-500', 'shadow-lg');
    }

    function createOptionElement(value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        return option;
    }

    categorySelect.addEventListener('change', updateSubcategories);
    subcategorySelect.addEventListener('change', updateVariables);
    variableSelect.addEventListener('change', checkVariableSelection);

    async function processFormSubmission(geography, selectedVariable, selectedVariableName) {

        // Define variables for DOM traversal
        let selectedCategory = '';
        let selectedSubcategory = '';
        let selectedVariableDetails = '';

        if (init) {
            geography = 'fayette';
            selectedCategory = 'Demographics';
            selectedSubcategory = 'Population';
            selectedVariable = 'B01001_001E';
            selectedVariableName = 'Total Population';
            variableSelect.options[0].classList.add('border-2', 'border-blue-500', 'shadow-lg');
            init = false;
        } else {
            selectedVariable = variableSelect.value;
            selectedVariableName = variableSelect.options[variableSelect.selectedIndex].text;
        }



        selectedCategory = categorySelect.options[categorySelect.selectedIndex].text;

        selectedSubcategory = subcategorySelect.options[subcategorySelect.selectedIndex].text;

        selectedVariableDetails = data[selectedCategory][selectedSubcategory].variables[selectedVariableName];

        console.log(selectedVariableDetails);

        geography = geography || document.querySelector('input[name="geography"]:checked').value;

        if (selectedVariableDetails['transform']) {
            selectedVariable += ("," + selectedVariableDetails['base']);
        }
        console.log('Selected variable:', selectedVariable);
        const requestData = {
            selectedVariable,
            geography
        };


        console.log('Sending request data to PHP backend:', requestData);

        const response = await fetch('https://contig.us/geogoblin/equity-map/api-gateway.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        console.log('Response from server:', responseData);
        const acsParsedData = parseACSData(responseData);
        console.log('Parsed ACS data:', acsParsedData);

        // Process/transform parsed data here or in acsParsedData function

        // Calculate breaks based on quantiles and create the color scale
        const quantileBreaks = chroma.limits(Object.values(acsParsedData).filter(val => val > 0), 'q', 5);
        breaks = quantileBreaks; // Store the breaks globally
        colorScale = chroma.scale(['#add8e6', '#00008b']).mode('lch').domain(breaks); // Modifies color scale

        updateLegend(selectedVariableName); // Updates the legend when a new variable's data is received

        updateMapLayer(geography, acsParsedData, selectedVariableName);
    }

    submitBtn.addEventListener('click', async () => {
        await processFormSubmission();
    });

    // Geography input changes listener
    document.querySelectorAll('input[name="geography"]').forEach(input => {
        input.addEventListener('change', async event => {
            // Manages initial geography change from default
            // init = true;
            // Call the processFormSubmission function with the new geography value.
            // This ensures the form submission process completes before updating the map layer.
            await processFormSubmission(event.target.value);
            // init = false;
        });
    });

    initializeMap();

    var map = L.map('map').setView([37.8393, -86], 7.5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Function to update the map with the new GeoJSON layer
    function updateMapLayer(geography, acsData, selectedVariableName) {
        // Remove existing layer if it exists
        Object.values(currentLayers).forEach(layer => {
            map.removeLayer(layer);
        });

        // Clear the currentLayers object to ensure it only contains the newly added layer
        currentLayers = {};

        // Load new GeoJSON layer
        const geoJsonPath = `data/${geography}.geojson`;
        fetch(geoJsonPath)
            .then(response => response.json())
            .then(data => {
                // Merge ACS data into GeoJSON
                data.features.forEach(feature => {
                    const geoCode = feature.properties[{
                        'fayette': 'TRACTCE',
                        'counties': 'COUNTYFP',
                    }[geography]];

                    // Assign the variable value from ACS data to the GeoJSON feature
                    feature.properties.variableValue = acsData[geoCode] || 0; // Default to 0 if not found
                });
                console.log('Merged GeoJSON with ACS data (not yet transformed):', data);
                // Store the new layer in the currentLayers object
                currentLayers[geography] = L.geoJson(data, {
                    // Define the style for GeoJSON layer
                    style: function (feature) {
                        return {
                            fillColor: getColor(feature.properties.variableValue),
                            weight: 1,
                            opacity: 1,
                            color: 'white',
                            fillOpacity: 0.7
                        };
                    },
                    // Bind popups to each feature
                    onEachFeature: function (feature, layer) {
                        // Define the content of the popup
                        const popupContent = `<h3>${feature.properties.NAMELSAD}</h3>` +
                            `<p>${selectedVariableName}: ${feature.properties.variableValue}</p><div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                            <p class="font-bold">Warning</p>
                            <p>Represented data are raw counts and are not yet standardized.</p>
                        </div>
                        `;
                        // Bind the popup to the layer
                        layer.bindPopup(popupContent);
                    }
                }).addTo(map);

                // Check if the selected geography is 'fayette' and set the map view to Fayette County, KY
                if (geography === 'fayette') {
                    // Set the map view to the center of Fayette County, KY, and adjust the zoom level.
                    map.setView([38.0406, -84.5037], 11.25);
                } else {
                    // Optionally, set default view
                    map.setView([37.8393, -86], 7.5);
                }
            })
            .catch(error => console.error('Error loading the GeoJSON:', error));
    }

    // Initialize map based on default selections
    async function initializeMap() {
        await loadVariables();
        await processFormSubmission();
    }

    function updateLegend(variableName) {
        const legendTitle = document.getElementById('legendTitle');
        const legendValues = document.getElementById('legendValues');

        legendTitle.textContent = 'Selected Variable: ' + variableName;

        const scaleDivs = document.querySelectorAll('#legendScale div');
        scaleDivs.forEach((div, index) => {
            if (breaks && index < breaks.length) {
                div.style.backgroundColor = colorScale(breaks[index]).hex();
                // div.textContent = breaks[index];
            }
        });

        if (breaks.length > 0) {
            legendValues.children[0].textContent = 'Min: ' + breaks[0];
            legendValues.children[legendValues.children.length - 1].textContent = 'Max: ' + breaks[breaks.length - 1];
        }
    }

    function parseACSData(acsData) {
        let parsedData = {};

        // Skip the first row since it's header information
        for (let i = 1; i < acsData.length; i++) {
            const row = acsData[i];
            const geoCode = row[row.length - 1]; // the geographic code
            const variableValue = row[0]; // the FIRST variable value (tranformation will be needed for most variables)

            // Store the variable value keyed by the geographic code
            parsedData[geoCode] = parseInt(variableValue, 10); // Convert to integer for mapping
        }

        return parsedData;
    }

    function getColor(value) {
        // Use Chroma.js to get color corresponding to the value
        if (value === 0) return '#f0f0f0'; // Neutral color for zero or missing values
        return colorScale(value).hex();
    }

});