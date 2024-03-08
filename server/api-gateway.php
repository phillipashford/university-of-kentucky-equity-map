<?php
// Though unconventional to include backend PHP code in a repository, because this is a learning project, I'm including the API gateway code here for the sake of completeness. In a real-world scenario, I would have a private server-side repository for the backend code.

// Allow CORS from GitHub Pages domain
header('Access-Control-Allow-Origin: https://phillipashford.github.io');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Respond to preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Pre-flight request. Exit successfully for the browser to proceed.
    exit(0);
}

// Set headers for JSON response
header('Content-Type: application/json');

// Read the JSON POST input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate and sanitize input
$validGeographies = ['fayette', 'counties'];
$geography = array_key_exists('geography', $data) ? $data['geography'] : '';
$selectedVariable = array_key_exists('selectedVariable', $data) ? filter_var($data['selectedVariable'], FILTER_SANITIZE_STRING) : '';

if (!in_array($geography, $validGeographies) || empty($selectedVariable)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid input']);
    exit; // Stop script execution after sending the error
}

// Initialize parameters based on validated and sanitized input
$forParameter = '';
$inParameter = '';

switch ($geography) {
    case 'fayette':
        $forParameter = 'tract:*';
        $inParameter = 'state:21+county:067';
        break;
    case 'counties':
        $forParameter = 'county:*';
        $inParameter = 'state:21';
        break;
}

// Census API key
$apiKey = 'XXXXXXXXXXXXXXXXXXXXXXX';

// Constructs the API URL with sanitized parameters
$apiUrl = "https://api.census.gov/data/2022/acs/acs5?get={$selectedVariable}&for=" . urlencode($forParameter) . ($inParameter ? "&in=" . urlencode($inParameter) : '') . "&key={$apiKey}";

// Makes the GET request to the Census API
$response = @file_get_contents($apiUrl);

if ($response === FALSE) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Failed to fetch data from the Census API']);
} else {
    // Returns the successful response to the frontend
    echo $response;
}
?>
