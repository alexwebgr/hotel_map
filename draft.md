i want to build a hotel map using this html as input
* i want to split up css and js in their own files
* i also need a better way to persist the saved pins as i save them so they are re-applied on refresh. for now lets use localstorage but eventually i am going to be hosting this on cloudflare so we could use a d1 db
* i also need a search bar in the map view that focuses the map and highlights the pin 
* for logged in users - for now just a simple button that marks the user as logged in will eventually we will integrate with cloudflare protected pages   
  * adding / deleting pins should of course require auth
    i want to be able to save my current location as geo json
  * types of pins
    * rooms
    * pool
    * bar
    * reception
    * restaurant
    * gym
  * so we need a dropdown for those options next to the existing field
  * i need a toggle that enables adding pins and clicking on the map so the add pin form is only visible when the toggle in on
  * need to investigate the cloudflare login flow for managing the pins

schema
* users
* pins
  * lat
  * lon
  * type
  * label
  * metadata

initially i need to validate the idea then we can make it production ready it should definitely work smootly on a mobile devices so lets make the ui responsive 
come up with a plan on how to implement this 

* export geojson make it a button at the top right along with login/logout and a button to show the pin pills which is only visible to logged in users
* make hybrid default map mode
* the label of the pin should be the name attribute
* Add pins buttons is not selected by default when clicked the label remains the same, so basically when we visit the app we are in view mode and only when clicking on add pins we add pins
* the add pin form title is Add pin, below is the pin type next to it the field to enter the name next to it the submit button followed by cancel 
* the search pin is a small field at the top center of the screen, does nothing as the user types and enter is hit it centers the map around that pin and highlights it 
* the pin pills appear in a collapsible sidebar at the right of the screen

* replace the onclick html attributes with js event handlers
* download and use the leaflet js files 
* use a local font like helvetica
