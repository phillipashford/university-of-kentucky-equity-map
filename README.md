<!-- Proposal template for GitHub README.md file
Map Title
Subtitle (optional)
Permanent URL
I. Introduction

Provide an introductory paragraph or two. This should answer the following questions for your reader:

What geographical phenomena or processes does the map represent?
what are the real world entities or processes you are mapping?
where do these entities or processes occur?
when did these phenomena or processes happen?
What work does the map do?
Frame this answer in terms of the intended user or audience and the user experience (UX) you're seeking to create. - e.g., "The map will appeal to X people and show/reveal/explore Y and Z to them ...".
Then, describe how it will affect the user. - e.g., "The user will be informed/inspired/motivated/emotional/made more curious ...".
Finally, provide a statement of the project's broader impact. - e.g., "The map will help provide an unmet need for society to better understand X."
[mockup/wireframe image here] -->
# University of Kentucky Equity Map
A [dynamic, interactive equity map](https://phillipashford.github.io/university-of-kentucky-equity-map/) for the state of Kentucky, with a focus on Fayette county, to visually represent equitable business, workforce, and economic development opportunities.

The map visualizes US Census data from the American Community Survey 5-year dataset (current iteration only includes 2022 data). 
#### The data attributes visualized include:
* Demographic Data
* Economic Indicators
* Educational Data
* Housing and Living Conditions
* Healthcare Accessibility
* Transportation and Commuting Patterns
## Data
### Data Collection
<!-- Sources: Detail the sources from which you've collected your data. Are these primary or secondary sources? Are there any notable organizations, databases, or APIs you've utilized?
Formats: Describe the existing formats of your collected data. Is it in CSV, JSON, GeoJSON, or another format?
Challenges: Share any challenges you've encountered in the data collection phase. How have you addressed these challenges, or how do you plan to tackle them? -->
#### Sources
The data for this project (in its current iteration) is sourced exclusively from the US Census Bureau.
1. The geographies are represented by geojson files which were created via the following workflow:
    * Downloaded [Census TIGER/Line Shapefiles](https://www.census.gov/cgi-bin/geo/shapefiles/index.php).
    * Filtered in QGIS.
    * Exported the layers as geojson files. 
2. The data is being retrieved from the Census ACS ([American Community Survey](https://www.census.gov/programs-surveys/acs/data.html)) API. We are retrieving the ACS 5 year data specifically.
#### API Queries
The program requests data from the API with programmatically generated query strings that are based on user selections. Valid requests will include at least one 'variable' (attribute) code, for example 'B01001_001E' ('Total Population', and one geography parameter).
```
https://api.census.gov/data/2022/acs/acs5?get=B01001_001E,B01002_001E,B02001_001E&for=county:*&in=state:21
```
#### API Gateway
The requests are routed through an API gateway on the server. This is a [php script](https://github.com/phillipashford/university-of-kentucky-equity-map/blob/main/server/api-gateway.php) which validates and sanitizes the queries before sending them to the Census API. This script also shields the API key and reports Census-born errors back to the client.
#### Challenges
Sourcing the codes for specific variables was a significant challenge. I was previously only vaguely familiar with Census data and its structure. I solved this problem by educating myself via two primary sources, and by creating a well organized and programmatically accessible schema for storing variables data:
*  The Census Reporter 

    Billing itself as ('...an independent project to make data from the American Community Survey (ACS) easier to use'), the [_Census Reporter's_ website](https://censusreporter.org/) served as a great primer for understanding the diffferent [datasets](https://censusreporter.org/topics/about-census/), their [tables](https://censusreporter.org/topics/table-codes/), 'concepts', and their variable codes. The US Census website was overwhelming. _Census Reporter_ guided me through a curated selection of Census applications and webpages, provided greater context for understanding the content.

* The US Census Website

    Once I developed a better handle on navigating and understanding the Census site, I was able to complete more fruitful research within it. Not only did I pinpoint specific reference material necessary for this project (such as [table shells](https://www.census.gov/programs-surveys/acs/technical-documentation/table-shells.html)), but I also came across material that will help with gaps in my knowledge. 
    
    For example, the [Statistical Testing Tool](https://www.census.gov/programs-surveys/acs/guidance/statistical-testing-tool.html), uses the margin of error values along with estimate values to determine statistical significance. The tool is provided as an [excel spreadsheet](https://www.census.gov/content/dam/Census/programs-surveys/acs/data/tables/Statistical_Testing_Tool.xlsx) into which a user can copy and paste or otherwise import values. 
    
    Following such a workflow to compare all variables against one another for all geographies would be immensely time-consuming. However, what is so helpful about this tool is that I can work from the formulas built into the spreadhseet to create statistical testing functionality that will be programmatically performed on the data retrieved by the app. By this method, I will be able to report to the user whether any bivariate comparison's results are sound.

* Variables Schema ([_acsVariables.json_](https://github.com/phillipashford/university-of-kentucky-equity-map/blob/main/public/data/acsVariables.json))

    This client-side object stores all of the variables our app works with. They are stored within subcategories, within categories. Each variable itself is an object containing several pieces of information:
    ```
    "Demographics": {
        "Age and Gender": {
            "variables": {
                "Total Population": {
                    "code": "B01001_001E",
                    "transform": null,
                    "base": "none",
                    "baseLabel": "none"
                },
                "Male Population": {
                    "code": "B01001_002E",
                    "transform": "percentage",
                    "base": "B01001_001E",
                    "baseLabel": "Total Population"
                },
                "Female Population": {
                    "code": "B01001_026E",
                    "transform": "percentage",
                    "base": "B01001_001E",
                    "baseLabel": "Total Population"
                }
            }
        },
        "Race and Ethnicity": {...
    ```
    Commented object for reference:
    ```
        "Demographics": { //category
        "Age and Gender": {         // subcategory
            "variables": {          // while not strictly necessary, each subcategory's 'variable' object provides dev-friendly programmatic access for future developers
                "Total Population": {             // user friendly label for variable
                    "code": "B01001_001E",        // variable code
                    "transform": null,            // does the raw data need to be altered before visualization? if so, the type of transformation goes here (percentage, sum percentage, currency, rate per thousand, etc.)
                    "base": "none",               // if so, and if there is another piece of data that it needs to be calculated against, the value of 'base' is the variable code for that data 
                    "baseLabel": "none"          // the user-friendly label for the base variable
    ```
### Data Cleaning and Preparation
<!-- Outline the steps you've taken (or plan to take) to clean and prepare your data. This might include normalizing data formats, handling missing values, correcting errors, and removing duplicates.
Highlight any specific tools or techniques you've employed to streamline this process. -->
#### API Responses
A successful response from the Census API is returned via the gateway and is formatted as an array of arrays. The first child array contains the header data including the variable codes sent along in the request, as well as geoid attribute labels. Subsequent arrays contain the raw value (an estimate) of a given variable for the specifed geography. 
```
[
    [
        "B01001_001E",
        "B01002_001E",
        "B02001_001E",
        "state",
        "county"
    ],
    [
        "18887",
        "40.3",
        "18887",
        "21",
        "001"
    ],
    [
        "20773",
        "40.5",
        "20773",
        "21",
        "003"
    ],
    ...
]
```
When the user selects a single variable for visualization, it is passed to formSubmission() where it is checked against the acsVariables.json reference object which provides the variable code, the transform value (if any) and the variable code of any base variables which are required for transformation. The pseudocode for this is as follows:
```
CODE = ACS_VARIABLES.VARIABLE.CODE
IF ACS_VARIABLES.VARIABLE.TRANSFORM
    TRANSFORM_TYPE = ACS_VARIABLES.VARIABLE.TRANSFORM
    BASE_CODE = ACS_VARIABLES.VARIABLE.BASE
DATA = REQUEST_DATA(CODE, GEOGRAPHY, BASE_CODE)
PARSED_DATA = PARSE_DATA(DATA)
TRANSFORMED_DATA = TRANFORM(TRANSFORM_TYPE, PARSED_DATA.VARIABLE, PARSED_DATA.BASE_VARIABLE)
UPDATE_MAP(TRANSFORMED_DATA)
```

When the user selects two variables for comparison they will be passed to formSubmisssion() for transformation and their data will then be passed to statistical testing functionality (PENDING). Once this function is in place, the reliability of the comparison of any two variables (the function's result) will be passed to updateMap() to inform the user. 

#### Error Handling and Validation (PENDING)
* UI
    * User-friendly error messaging and visual indicators
    * Inform users about any issues encountered during data retrieval
* Functionality
    * Loading state management
    * Unexpected response - and processed data - formats
        * Handle cases where data might be zero or missing, to avoid division by zero errors or misleading percentages.
    * API Issues
        * Default to a backup data source if the primary API call fails.
        * Attempt to re-parse erroneous response data
        * Provide informative error messages
    * Logging mechanisms for debugging purposes
    * Caching mechanisms to optimize data retrieval and usability.
### Data Analysis Insights
<!-- If you've started analyzing your data, share any preliminary insights. Are there any patterns, anomalies, or outliers that have emerged?
Discuss how these findings might influence the direction of your project. Do they validate your initial hypothesis, or are they pointing you in a new direction? -->
#### Single Variable Visualization (PENDING)
* After applying transformations required for standardization and formatting, analysis of the visualized data values will be discussed here.
#### Variable Comparisons (PENDING)
* Limited to 2 variables in this iteration.
* After applying transformations and statistical testing, analysis of the visualized comparisons will be discussed here.
### Obstacles and Solutions
<!-- Describe any obstacles you've encountered in the data preparation or analysis phase. What strategies have you considered to overcome these challenges? Be sure to reach out/include your instructor in this process. -->
#### Error Handling and Validation
As discussed, comprehensive error handling and validation have yet to be implemented with a few exceptions:
* Sanitization and validation of queries sent to the API gateway
* Errors returned to the client from the API gateway

#### Data Access Reliability
        
##### Problem
Current functionality enables retrieval of live data from the US Census API. In the instance when the API is down or changes have been made to the API that cause bugs in the app, there is no backup solution.
##### Solution(s) (PENDING)
**1. Custom DB**

The backend database will be populated with comprehensive application data. Necessary architecture includes:
* **DB population:** A server side script for programmatically retrieving data (eventually via a cron job) from the API and populating tables with it in the database.
* **DB querying and retrieval** Conditional functionality in the API gateway script:
    * If the response from the API is bad, send the query to the database, retrieve the data, and send it back to the client in a format acceptable to the client-side parsing and processing functions.

**2. [Census Reporter API](https://github.com/censusreporter/census-api?tab=readme-ov-file)**

[Census Reporter](https://censusreporter.org/) maintains a PostgreSQL database housing the ACS datasets. They make it accessible to clients via API. Integration with this API could be a backup method for data retrieval.

**3. Flat Files**
* **Asynchronous Flat File retrieval:** Depending on the comprehensive data volume (not yet determined) it may be worth default retrieval and storage of it in its entirety on the client-side.

* **Caching:** Alternatively, upon successful retrieval of user-selected data, a client-side flat file could provide for caching. This will optimize the retrieval of previously/frequently selected data. 

### Next Steps
<!-- Outline your anticipated next steps in the project. How will you move forward with data analysis, visualization, and storytelling?
Consider any additional data you might need, analysis techniques to apply, or visualization strategies to explore. -->


* Inclusion of yet to be acquired variable objects in the acsVariables object.
    * In-migration and out-migration
    * Longevity metrics
    * Food security metrics
    * Place of origin
    * Household Size and Composition
    * Average household size
    * Types of households (e.g., single-family, multi-generational)
    * LGBT data (proxy measures necessary)
        * Household Relationships (e.g., households with same-sex partners)
        * Marital Status: (e.g., same-sex married couples)
    * Business Ownership
    * Number and percentage of minority-owned businesses
    * Number and percentage of women-owned businesses
    * Distribution of housing types (e.g., single-family homes, apartments)
    * Housing Affordability and Costs
    * Median housing costs
    * Rates of housing cost burden
    * Percentage of overcrowded households
    - Average commute time
    * As requested and/or needed for data transformation

* Transform functionality

* Bivariate analysis
    * Statistical testing functionality

* User-accessible raw values
    * Viewing functionality
    * Download functionality (CSV)
<!-- Proposal template for GitHub README.md file
Map Title
Subtitle (optional)
Permanent ULR
I. Introduction

Provide an introductory paragraph or two. This should answer the following questions for your reader:

What geographical phenomena or processes does the map represent?
what are the real world entities or processes you are mapping?
where are do these entities or processes occur?
when did these phenomena or processes happen?
What work does the map do?
Frame this answer in terms of the intended user or audience and the user experience (UX) you're seeking to create. - e.g., "The map will appeal to X people and show/reveal/explore Y and Z to them ...".
Then, describe how it will affect the user. - e.g., "The user will be informed/inspired/motivated/emotional/made more curious ...".
Finally, provide a statement of the project's broader impact. - e.g., "The map will help provide an unmet need for society to better understand X."
[mockup/wireframe image here]

II. Methodology
First provide a general statement summarizing the following subsections (one or two sentences).

A. Data
What are the content requirements for your map? Provide a description of the following:

data source(s) with links
wrangling and analysis process (include indication of tools you used, e.g., QGIS, spreadsheet applications, Python/Jupyter Notebooks, pandas, etc)
an example of the cleaned data (e.g., the first 10 rows of a pandas GeoDataframe or CSV file ... could be a screenshot or you can format example within a Markdown table. If in Jupyter notebooks export to HTML and copy/paste the table created with a DataFrame)
anticipated format when ready for web map (e.g., GeoJSON/CSV flat files, remote-hosted PostGIS database, etc).
additional content you'll want to obtain or generate for the final map (supplementary descriptive text, images, etc).
B. Medium for delivery
Begin with a topic sentence, something like, "The map is a web browser-based application accessible across mobile and desktop devices ...."

Then provide a description of your (anticipated) technology stack and likely JavaScript libraries. For most of us the baseline will be HTML/SVG/CSS/JS and Leaflet. We'll likely want to user a responsive framework (i.e., Bootstrap, Assembly.css).

Given your representation and interaction requirements listed below, consider what other libraries you may use. For example, if you're going to do some buffer analysis perhaps you'll use Turf.js. If classifying data on the fly, perhaps simple-statistics.js. If doing address geolocation in a search bar or routing, then note these as well.

C. Application layout
Here you'll want to consider the general layout of the web page and how it will "respond" to different device sizes. It's probably easiest to include 2 or three very simple wireframes showing mobile, tablet, and desktop layouts (not detailed mockups).

Also see: https://gistbok.ucgis.org/bok-topics/mobile-maps-and-responsive-design Links to an external site.

D. Thematic representation
Describe how the data will be visually represented (points, lines, polygons) and what thematic technique you will employ (icons or proportional symbols for points, classified choropleth for polygons).

You may also want to indicate what visual variables you will use to encode your information (i.e., the size of the proportional symbol to encode the amount of X, different hues to encode nominal distinctions between features).

Also see: https://gistbok.ucgis.org/bok-topics/symbolization-and-visual-variablesLinks to an external site.

E. User interaction
In this section describe how the user will engage or interact with the map. Will be a more simple scrolling interface? With the user need to pan/zoom and hover or click on features to retrieve information? Will there be additional user interaction elements for selecting, filtering, or changing the map?

Describe what the user interface will be composed of (toggle buttons, search forms, .etc) and the result. How will the UI elements affect the representation of the data or map experience?

Include additional mockups of either the entire application or specific parts of the user interface.

You may want to include an example of a user persona/scenario here if it helps describe the intent of your map design (see MAP673 modules 05/06).

Also see: https://gistbok.ucgis.org/bok-topics/user-interface-and-user-experience-uiux-design Links to an external site.

F. Aesthetics and design considerations
Here a full mockup may be useful, but not necessary. You may also simply offer some anticipated design solutions for your map. Think about:

colors (what's the tone of the map?)
dark vs light motif
font choices
modern or flat design? something more flamboyant or artsy?
G. Conclusion
Provide a brief (one or two paragraphs) statement to conclude the proposal. This will likely be restating what you said in the introduction, but also (re)consider the format we used in the first assignment (a topic with a motivating question). -->