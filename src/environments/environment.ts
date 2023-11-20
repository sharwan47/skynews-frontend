// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// export const environment = {
//   production: false,
//   serverUrl: 'http://host.docker.internal:3333',
//   apiUrl: '',
//   pusherId:'015a6069e5c2386ddd87',
//   oktaDomain: 'dev-52966358.okta.com',
//   oktaClientId: '0oa7bhw86d3OHcQoW5d7',
//   oktaIssuer: 'https://dev-52966358.okta.com/oauth2/default'
// };

// export const environment = {
//   production: false,
//   serverUrl: 'https://skynewsapi.resources365.org',
//   apiUrl: '',
//   pusherId:'015a6069e5c2386ddd87',
//   oktaDomain: 'newscorp.okta.com',
//   oktaClientId: '0oaydlpaeeLB8q5Dr0x7',
//   oktaIssuer: 'https://newscorp.okta.com/oauth2/default'
// };

export const environment = {
  production: false,
  serverUrl: 'http://localhost:3333', // Your local Node.js server URL
  apiUrl: 'http://localhost:3333', // Use the same Node.js server URL for the API
  pusherId: '015a6069e5c2386ddd87', // Keep this unchanged
  oktaDomain: 'newscorp.okta.com', // Keep this unchanged
  trelloApiKey:'8e4a489ec4dc7c0a95950259706aefe0',
  trelloTokenKey:'ATTA03341ab20cfa0de69e2f0f603ef3ada912dccb178d8d8691e2e991e1ed7813ad2D337DAD',
  oktaClientId: '0oaydlpaeeLB8q5Dr0x7', // Keep this unchanged
  oktaIssuer: 'https://newscorp.okta.com/oauth2/default', // Keep this unchanged
  testAllowApprove:true
};



// export const environment = {
//   production: true,
//   serverUrl: 'https://skynewsapi.resources365.org',
//   apiUrl: '',
//   pusherId:'015a6069e5c2386ddd87',
//   oktaDomain: 'trial-9904588.okta.com',
//   oktaClientId: '0oa41iiytvW6G1caV697',
//   oktaIssuer: 'https://trial-9904588.okta.com/oauth2/default'
// };

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
