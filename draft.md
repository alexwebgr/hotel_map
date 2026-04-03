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
