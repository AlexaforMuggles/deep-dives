const Alexa = require('ask-sdk'); // loads the Alexa Skills Kit Software Development Kit
const Moment = require('moment-timezone'); // imports Moment which is a module to deal with dates

const LaunchRequestHandler = { //Launch requests start up the skill when a client has not (yet) linked their account
  canHandle(handlerInput) { // canHandle decides whether the input concerns this handler or not
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest'; // this handler can proceed if this is a launchRequest but not if it's another type of request
  },
  handle(handlerInput) { //once the canHandle decides that this handler can process the request the handle function determines what exactly needs to be done

    const attributesManager = handlerInput.attributesManager; // the attributesManager contains data regarding request, sessions and persistence. 
    const sessionAttributes = attributesManager.getSessionAttributes(); // Provides session attributes extracted from request envelope. What is in the request envelope? 

    const speechText = getWelcomeMessage(sessionAttributes) // defines what Alexa says in the Welcome Message. It looks up sessionAttributes to determine if it's a first-time or repeat user. 
      + " " 
      + getPrompt(sessionAttributes); //decides what to say based on whether the user is here for the first time or not

    return handlerInput.responseBuilder //The handlerInput is an interface that represents components passed into CustomSkillRequestHandler and CustomSkillErrorHandler. The responseBuilder constructs what Alexa says to the user as a result of analysing the data in this particular handler. 
      .speak(speechText) // Alexa replies with the text defined in the variable speechText
      .reprompt(speechText) // if the user doesn't answer Alexa will repeat her prompt
      .withAskForPermissionsConsentCard(permissions) // this is needed where the client is asked to link their account so that infos such as location can be accessed by the skill
      .getResponse(); // Alexa waits for a response from the user. If this is not include the skill will finish after the info was given without listening to anything else the user might say. 
  },
};

const LaunchRequestWithConsentTokenHandler = { // Starts up the skill when the user has linked their account
  canHandle(handlerInput) { // canHandle decides whether the input concerns this handler or not
    return handlerInput.requestEnvelope.request.type === "LaunchRequest" //queries the requestEnvelope located in the session attributes for the type of request this is
      && handlerInput.requestEnvelope.context.System.user.permissions // has the user provided permission. Only if the answer is yes this handler will start up
      && handlerInput.requestEnvelope.context.System.user.permissions.consentToken; // if the user provided permission the system checks if the token exists and is valid. 
  },
  async handle(handlerInput) { //Async functions return a Promise. If the function throws an error, the Promise will be rejected.
    const attributesManager = handlerInput.attributesManager; //defines how we find the attributesManager (in handlerInput)
    const sessionAttributes = attributesManager.getSessionAttributes(); // session attributes can be found within the attributes Manager. If this hadn't been defined above we'd have to fetch the sessionAttributes in handlerInput.attributesManager.getSessionAttributes(); 

    const speechText = getWelcomeMessage(sessionAttributes) // provides Welcome message depending on first or repeat user
      + " " 
      + getPrompt(sessionAttributes); // provides prompt depending on first or repeat user
      
    return handlerInput.responseBuilder //this is how the response is constructed. It made of speech, reprompt and the ability to listen for what the user says next
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const SIPRecommendationIntentHandler = { // note sure yet what exactly this handler does
  canHandle(handlerInput) { //determines if this handler is responsible for the incoming request
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' // condition 1: request type is IntentRequest
      && handlerInput.requestEnvelope.request.intent.name === 'RecommendationIntent' // condition 2: name of the intent is RecommendationIntent
      && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED'; // condition 3: the dialogState is not yet completed
  },
  handle(handlerInput) { //once the handler decided it can handle this request here's what happens next: 
    
    let currentIntent = handlerInput.requestEnvelope.request.intent; //not sure yet what the currentIntent is needed for
    const { responseBuilder } = handlerInput; // not sure why the object called responseBuilder is set equal to the handler output 
    const result = disambiguateSlot(getSlotValues(currentIntent.slots)); // no idea what a disambiguateSlot is. Based on the function below it indicates perhaps when slots are not filled yet? 
    
    console.log('disambiguateSlot:', JSON.stringify(result)); //I would imagine this tells us which slots haven't been resolved yet

    if (result) { //if not all slots have been filled there will be prompts and reprompts designed to elicit missing slots. 
      responseBuilder
        .speak(result.prompt)
        .reprompt(result.prompt)
        .addElicitSlotDirective(result.slotName, currentIntent);
    } else {
      responseBuilder.addDelegateDirective(currentIntent); //once all slots are filled for the current intent it ceases to prompt the user
    }

    console.log('RESPONSE:', JSON.stringify(responseBuilder.getResponse())); //logs the response from the responseBuilder
    return responseBuilder
      .getResponse(); // seems to wait for the user to say something
  }
};

// not sure why the Alexa team commented out the following handler: 
// const CustomerProvidedMealRecommendationIntentHandler = {
//   canHandle(handlerInput) {
//     return handlerInput.requestEnvelope.request.type === "IntentRequest"
//       && handlerInput.requestEnvelope.request.intent.name === "RecommendationIntent"
//       && handlerInput.requestEnvelope.request.intent.slots.meal.value;
//   },
//   handle(handlerInput) {

//   }
// };

const SuggestMealRecommendationIntentHandler = { //once the info has been collected this handler recommends meals
  canHandle(handlerInput) {

    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();

    const slots = ["timeOfDay", "cuisine", "allergies", "diet"]; // the meal recommendations are based on these factors and can only be done once they have been given by the user
    
    console.log('SuggestMealRecommendationIntent - meals:', sessionAttributes.recommendations.current.meals.length); //I suspect this logs how many meals are recommended but am not sure
    console.log('SuggestMealRecommendationIntent - meals:', JSON.stringify(sessionAttributes.recommendations.current.meals)); // this logs the meal recommendations

    return handlerInput.requestEnvelope.request.type === 'IntentRequest' // 5 conditions needed to be able to fulfil this intent
      && handlerInput.requestEnvelope.request.intent.name === 'RecommendationIntent'
      && !handlerInput.requestEnvelope.request.intent.slots.meal.value // no meal suggestion exist yet
      && intentSlotsHaveBeenFilled(handlerInput.requestEnvelope.request.intent, slots) // all slots have been filled
      && !intentSlotsNeedDisambiguation(handlerInput.requestEnvelope.request.intent, slots); // not sure what Disambiguation is
  },
  handle(handlerInput) {
    console.log('SuggestMealRecommendationIntent:', handlerInput.requestEnvelope.request); // logs where we are

    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const currentIntent = handlerInput.requestEnvelope.request.intent;

    // TODO: Do the look up here!

    sessionAttributes.recommendations.current.meals = ["Domi Maeuntang", "Mae Un Tang", "Daegu Jorim"]; //defines what meals we have on offer for the selections the user made
    attributesManager.setSessionAttributes(sessionAttributes); // tells the system to set the Session Attributes to these options 

    console.log('currentIntent.slots:', JSON.stringify(currentIntent.slots)); // logs of the slots of the current intent that is being processed

    return handlerInput.responseBuilder
      .speak("Great, I've found 3 meals: Domi Maeuntang, Mae Un Tang and Daegu Jorim which sounds best?") // these are the options Alexa recommends. Would need to include variables once there are cuisine options that result from different choices
      .reprompt('Which sounds best Domi Maeuntang, Mae Un Tang or Daegu Jorim?') // Alexa repeats this if the client hasn't answered yet
      .addElicitSlotDirective('meal', currentIntent) // ensures that required slots are filled
      .getResponse(); //listens for the user input
  }
};

// TODO: handler for meals containing ingredients that conflict with their allergies and diet. --> would require an extensive slot list where every available meal would contain allergy info as well as whether it belongs to a certain diet (vegan, gluten-free, etc.)

const promptForDeliveryOption = { //the function of this option is to decide whether you will get food delivered, cook yourself or go out
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RecommendationIntent'
      && handlerInput.requestEnvelope.request.intent.slots.meal.value
      && !handlerInput.requestEnvelope.request.intent.slots.deliveryOption.value; // can only be handled if the delivery options haven't been answered already
  },
  handle(handlerInput) {
    
    return handlerInput.responseBuilder
      .speak('Which would like, eat in, eat out, or make it?')
      .reprompt('Would like to eat in, eat out, or make it?')
      .addElicitSlotDirective('deliveryOption')
      .getResponse();

  }
};

const CRecommendationIntentHandler = { // once the system knows your delivery option and the meal preferences it can suggest a particular place to get the food from
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "RecommendationIntent"
      && handlerInput.requestEnvelope.request.dialogState === "COMPLETED";
  },
  handle(handlerInput) {
    console.log("COMPLETED RecommendationIntent");

    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const slotValues = getSlotValues(currentIntent.slots);

    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();

    sessionAttributes.recommendations.previous = slotValues.meal.synonym; //tells us what the last recommendation was
    sessionAttributes[currentIntent.name] = undefined; // not sure what this does

    console.log("deleting slot data for:", currentIntent.name); // note sure why slots data was deleted, maybe it deletes the previous meal so that the current one can be saved
    console.log("after delete:", JSON.stringify(sessionAttributes));

    attributesManager.setSessionAttributes(sessionAttributes); //sets the session attributes based on what just happened

    let speechText = "";

    // TODO: split this into different completed handlers
    if (slotValues.deliveryOption.statusCode === "ER_SUCCESS_MATCH") { // if the slots are correctly resolved then this happens: 
      
      if (slotValues.deliveryOption.resolvedValues[0] !== "make") { // if the delivery option does not resolve to cooking at home then suggest the restaurants
        const address = sessionAttributes.profile.location.address; // define address to recommend restaurants close by
        if (address.zip || address.city && address.state) { // if you have the zip or the city and state address do this
          // TODO: look up where the restaurants would be
          console.log("look up the restaurants"); // logging what the program is doing, in this case, looking up restaurants
          speechText = "There's 2 restaurants close by korean bamboo and One pot. Which would you like?"; // offers the restaurant options

        } else {
          console.log("We need to elicit for address"); // logging what the program is doing, in this case, eliciting the address
          speechText = "To find a restaurant close by I need to know your address. What city do you live in?"; // asking for the address
        }
      } else {
        // TODO prompt for portion
        speechText = "Which would you like a small, medium, or large portion size?"; // asking for portion size
      }
    } else {
        // TODO: validate input for options - if we don't know ER_SUCCESS_NO_MATCH ask again
        speechText = "Which would you like? to eat out, order delivery, or cook"; // reprompt if one of the required slots is not filled 
        return handlerInput.responseBuilder // constructing the response using the following features
          .addElicitSlotDirective("deliveryOption") // not sure why it doesn't include all the slots that are being elicited but only the deliveryOption
          .speak(speechText)
          .reprompt(speechText)
          .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

// Not sure why this was included and then commented out since getting a meal seems to be covered in the recommendationIntent
// TODO: remove this
// const GetMealIntentHandler = {
//   canHandle(handlerInput) {
//     return handlerInput.requestEnvelope.request.type === "IntentRequest"
//       && handlerInput.requestEnvelope.request.intent.name === "GetMealIntent";
//   },
//   handle(handlerInput) {
//     return handlerInput.responseBuilder
//       .speak("Hello there")
//       .getResponse();
//   }
// };

// TODO: remove this --> why should this be removed? 
const LookupRestaurantIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "LookupRestaurantIntent";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("I've sent Korean Bamboo's address to the Alexa App. Bon apetit!") // this didn't actually send anything to the app, it just says it did
      .getResponse();
  }
};

const InProgressCaptureAddressIntentHandler = { // if the user provides their address, this handler is activated
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "CaptureAddressIntent" // although it's a separate handler, it's part of capturing the address
      && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED"; // distinction between inProgress and completed. This is all still in progress
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addDelegateDirective() // ensures that this slot is filled
      .getResponse();
  }
};

const InProgressHasZipCaptureAddressIntentHandler = { // if the user just provides their zip code this handler is activated
  canHandle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && currentIntent.name === "CaptureAddressIntent"
      && intentSlotsHaveBeenFilled(currentIntent, ["zip"]) // this line separates it from the other address intents
      && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED";
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const slotValues = getSlotValues(currentIntent.slots);
    let speechText = "There's 2 restaurants close to " + slotValues.zip.synonym; // constructs the answer with slot values close to that zip. Not sure though where the actual geolocation happens, probably in one of the helper functions further down. 
    speechText +=  " Korean Bamboo and One pot. Which would you like?"; // this hardcodes answers instead of using geolocation
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const InProgressHasCityStateCaptureAddressIntentHandler = {
  canHandle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && currentIntent.name === "CaptureAddressIntent"
      && intentSlotsHaveBeenFilled(currentIntent, ["city", "state"]) // this separates the city address handler from the others
      && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED";
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const slotValues = getSlotValues(currentIntent.slots);
    let speechText = "There's 2 restaurants close to " + slotValues.city.synonym // not sure what the synonym value is about here
      + ", " 
      + slotValues.state.synonym
      + " Korean Bamboo and One pot. Which would you like?";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};


const HelpIntentHandler = { // if the user asks for help this is what will be played back
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'This is the foodie. I will find the best meal and restaurant recommendations for you. To get started say I\'m hungry'; // provides an explanation and a next action

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('The Foodie', speechText) // shows The Foodie logo on an Alexa device that has a screen
      .getResponse(); // listens for what the user wants to do next
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!'; // once the user interrupts the skill to close it this will be played

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('The Foodie', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = { // this handler tells us why a session ended: it finished regularly, the user finished it or some error closed it
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'; // generic, part of every custom skill
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`); // logs the reason the session ended to CloudWatch

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = { // this is activated when there's an error
  canHandle() {
    return true; // different "anatomy" to other handlers. This is probably some shortcut defined in the Alexa API. 
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`); // logs the error message
    console.log(error.stack);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.') // error message played to user, can be customized
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* RESPONSE INTERCEPTORS */

// This interceptor loads our profile from persistent storage into the session
// attributes.
const NewSessionRequestInterceptor = { // loads info such as location into session attributes
  async process(handlerInput) { // starts the process of looking up if a profile exists or not
    console.log('request:', JSON.stringify(handlerInput.requestEnvelope.request)); // logging where the system is at

    if (handlerInput.requestEnvelope.session.new) { //this is triggered if the user never used the skill before (long enough to save data) 
      const attributesManager = handlerInput.attributesManager;
      let sessionAttributes = attributesManager.getSessionAttributes();

      const persistentAttributes = await attributesManager.getPersistentAttributes(); // persistentAttributes are delivered from the attributesManager and the system waits for them

      console.log('persistentAttributes:', JSON.stringify(persistentAttributes)); // logging what attributes exist in the database

      if (!persistentAttributes.profile) { // if no profile exists
        console.log('Initializing new profile...');
        sessionAttributes.isNew = true; // validating that profile is new
        sessionAttributes.profile = initializeProfile(); //setting up new profile
        sessionAttributes.recommendations = initializeRecommendations(); // sets up the info to save the recommendations that will be given later
      } else {
        console.log('Restoring profile from persistent store.'); // this kicks in if the user already has persistent data stored from a previous session
        sessionAttributes.isNew = false; // the profile is not new
        sessionAttributes = persistentAttributes; // session attributes are saved to persistent attributes
      }
      
      console.log("set sessionAttributes to:",JSON.stringify(sessionAttributes)); // gives us an output of what attributes were established and then saved
      attributesManager.setSessionAttributes(sessionAttributes); // saves session attributes in attributesManager
    }
  }
};

const SetTimeOfDayInterceptor = { // figures out if the user wants brunch, lunch, dinner or some snack based on time of day
  async process(handlerInput) {

    const { requestEnvelope, serviceClientFactory, attributesManager } = handlerInput; // serviceClientFactory Constructs service clients capable of calling Alexa APIs. This tells us exactly what is in the handlerInput: requestEnvelope, attributesManager and serviceClientFactory
    const sessionAttributes = attributesManager.getSessionAttributes(); //defines where to find sessionAttributes

    // look up the time of day if we don't know it already.
    if (!sessionAttributes.timeOfDay) { // if sessionAttributes don't have any info about the time of day then do this
      const deviceId = requestEnvelope.context.System.device.deviceId; // presumably the device Id is registered to a particular location, which in turn let's us know the time where the user is

      const upsServiceClient = serviceClientFactory.getUpsServiceClient(); // 
      const timezone = await upsServiceClient.getSystemTimeZone(deviceId); // timezone depends on location of device   

      const currentTime = getCurrentTime(timezone); // captures current time in timezone
      const timeOfDay = getTimeOfDay(currentTime); // time of day is a value such as lunch or dinner

      sessionAttributes.timeOfDay = timeOfDay; // defines whether lunch or dinner is captured in the session attributes
      sessionAttributes.profile.location.timezone = timezone; // captures time zone since this doesn't have to be established every time 
      attributesManager.setSessionAttributes(sessionAttributes);
      
      console.log("SetTimeOfDayInterceptor - currentTime:", currentTime); // logs time in device location
      console.log("SetTimeOfDayInterceptor - timezone:", timezone); // logs timezone
      console.log('SetTimeOfDayInterceptor - time of day:', timeOfDay); // logs whether it's lunch or dinner time
      console.log('SetTimeOfDayInterceptor - sessionAttributes', JSON.stringify(sessionAttributes)); //logs the results of the time lookup
    }
  }
};

const HasConsentTokenRequestInterceptor = { // did the user provide consent and therefore send over a token? 
  async process(handlerInput) {
    const { requestEnvelope, serviceClientFactory, attributesManager } = handlerInput; // defines what is in the handlerInput
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (handlerInput.requestEnvelope.context.System.user.permissions //did the user provide permission? 
        && handlerInput.requestEnvelope.context.System.user.permissions.consentToken // is there a valid permission token? 
        && (!sessionAttributes.profile.location.address.city // is the system unaware of the city
        || !sessionAttributes.profile.location.address.state // is the system unaware of the state
        || !sessionAttributes.profile.location.address.zip)) { // is the system unaware of the zip

      const { deviceId } = requestEnvelope.context.System.device; // device Id is saved as an object which means several kinds of info can be stored about the device (not just an id)
      const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient(); // the service client factory contains the device info
      const address = await deviceAddressServiceClient.getFullAddress(deviceId); // waits until the full device address is provided
        
      console.log(JSON.stringify(address)); // logs what address was saved
  
      if (address.postalCode) { 
        sessionAttributes.profile.location.address.zip = address.postalCode; // sets zip equal to postal code, the word that may be contained in the service client factory
      } else if (address.city && address.stateOrRegion) { // the system is also okay if it just receives the city and state or region without a zip
        sessionAttributes.profile.location.address.city = address.city;
        sessionAttributes.profile.location.address.state = address.stateOrRegion;
      }

      attributesManager.setSessionAttributes(sessionAttributes); // writes this info to the database
      console.log('HasConsentTokenRequestInterceptor - sessionAttributes', JSON.stringify(sessionAttributes)); // logs whether consent was given or not 
    }
  }
};


const RecommendationIntentStartedRequestInterceptor = { // This interceptor initializes our slots with the values from the user profile.
  process(handlerInput) { //what does the process keyword do? 
    if (handlerInput.requestEnvelope.request.type === 'IntentRequest' //condition 1: It's an intent request
      && handlerInput.requestEnvelope.request.intent.name === 'RecommendationIntent' //condition 2: the name of the intent is RecommendationIntent
      && handlerInput.requestEnvelope.request.dialogState === "STARTED") { // condition 3: it has just started up
        console.log("recommendationIntentStartedRequestInterceptor:", "Initialize the session attributes for the intent."); // logging what the program is doing

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const profile = sessionAttributes.profile; // define the user profile in the sessionAttributes
        
        const updatedIntent = handlerInput.requestEnvelope.request.intent; // capture the changes done to the user profile by defining an updatedIntent variable

        updatedIntent.slots.name.value = profile.name || undefined; // name of the user set to undefined until info is given by user
        updatedIntent.slots.diet.value = profile.diet || undefined; // name of the user's dietary preferences set to undefined until info is given by user
        updatedIntent.slots.allergies.value = profile.allergies || undefined; // name of the user allergies set to undefined until info is given by user

        updatedIntent.slots.timeOfDay.value = sessionAttributes.timeOfDay || undefined; // time of day undefined until date function is triggered

        console.log(JSON.stringify(updatedIntent)); // logging where the program is at
      }
  }
};

const RecommendationIntentCaptureSlotToProfileInterceptor = { // takes fulfilled allergy and diet slots and moves it to the user profile
  process(handlerInput) {
    const intentName = "RecommendationIntent";
    const slots = [ "allergies", "diet"];
    console.log('recommendationIntentCaptureSlotToProfileInterceptor'); // logging what function is being executed
    saveNewlyFilledSlotsToSessionAttributes(handlerInput, intentName, slots, (sessionAttributes, slotName, newlyFilledSlot) => { // saveNewlyFilledSlotsToSessionAttributes is introduced here but called in other interceptors later. Makes sense as we need to save these slots to the profile however how does this interact with the persistence adaptors? 
      sessionAttributes.profile[slotName] = newlyFilledSlot.synonym; // still not sure what .synonym does. Does it create an empty array so that synonyms can be added later? Or is it only used if a synonym has been used instead of the 'official slot name'? 
    });
  }
};

const CaptureAddressIntentCaptureSlotsToProfileInterceptor = { // how does this address interceptor relate to other address functions above? 
  process(handlerInput) {
    const intentName = "CaptureAddressIntent"; 
    const slots = ["zip", "city", "state"]; // the slots required to fulfill this intent
    console.log('CaptureAddressIntentCaptureSlotsToProfileInterceptor call saveNewlyFilledSlotsToSessionAttributes'); // logging where the program is as well as the attributes
    saveNewlyFilledSlotsToSessionAttributes(handlerInput, intentName, slots, (sessionAttributes, slotName, newlyFilledSlot) => { // saves all this info to the sessionAttributes
      sessionAttributes.profile.location.address[slotName] = newlyFilledSlot.synonym; // this interceptor only gets used during a session where the location data is newly provided
    });
  }
};

function saveNewlyFilledSlotsToSessionAttributes(handlerInput, intentName, slots, callback) { // the interceptor actually writes the address data into the profile as opposed to eliciting the information
  const attributesManager = handlerInput.attributesManager; 
  const sessionAttributes = attributesManager.getSessionAttributes();
  const currentIntent = handlerInput.requestEnvelope.request.intent;

  if (handlerInput.requestEnvelope.request.type === "IntentRequest"
    && currentIntent.name === intentName) { // seems a bit generic, shouldn't it be addressIntent or some specified name? --> no. This allows this code to be re-usable in different intents.
    
    const previousIntent = sessionAttributes[currentIntent.name];
    console.log('CALL intentHasNewlyFilledSlots IN saveNewlyFilledSlotsToSessionAttributes ');
    const newlyFilledSlots = intentHasNewlyFilledSlots(previousIntent, currentIntent, slots);
    console.log('saveNewlyFilledSlotsToSessionAttributes');

    if (newlyFilledSlots.found) { // if there are new slots then this happens, otherwise the code block doesn't run
      for (let slotName in newlyFilledSlots.slots) { // let is required here as the slotName might be changed here. Also it iterates for as long as there are new slots to be filled. 
        console.log('inserting:', // logging
        slotName, JSON.stringify(newlyFilledSlots.slots[slotName]), // logging
        JSON.stringify(sessionAttributes)); // logging
        callback(sessionAttributes, slotName, newlyFilledSlots.slots[slotName]); // not sure what we use this callback for
      }
      attributesManager.setSessionAttributes(sessionAttributes); // takes the attributes from the current session and sets them as sessionAttributes so they can be queried next time
    }
  }  
}

const DialogManagementStateInterceptor = { // This interceptor handles intent switching during dialog management by syncing the previously collected slots stored in the session attributes with the current intent. This allows the user to interrupt doing one thing, for example giving their address, then mentioning something else and later picking back up again at providing missing address info
  process(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.type === "IntentRequest" // generic intent name so that dialog management can be used accross all applicable intents
      && handlerInput.requestEnvelope.request.dialogState !== "COMPLETED") {

      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();

      if (sessionAttributes[currentIntent.name]) { // if there is a name for the currentIntent in the sessionAttributes then do this: 
        let currentIntentSlots = sessionAttributes[currentIntent.name].slots; // currentIntentSlots can be overwritten and are found in the sessionAttributes
        for (let key in currentIntentSlots) { // not sure what this key does

          if (currentIntentSlots[key].value && !currentIntent.slots[key].value) { // don't know what this does exactly
            currentIntent.slots[key] = currentIntentSlots[key]; // don't know what this does exactly
          }
        }    
      }

      sessionAttributes[currentIntent.name] = currentIntent; // by capturing the name of the currentIntent and saving the sessionAttributes Alexa can move to another Intent and then later pick up, where she left off
      attributesManager.setSessionAttributes(sessionAttributes); // captures the data in the sessionAttributes
    }
  }
};

/* Response INTERCEPTORS */

const SessionWillEndInterceptor = { // This Response interceptor detects if the skill is going to exit and saves the session attributes into the persistent store.
  async process(handlerInput, responseOutput) {

    // not sure what these two commented out lines are supposed to mean: 
    // let shouldEndSession = responseOutput.shouldEndSession;
    // shouldEndSession = (typeof shouldEndSession == "undefined" ? true : shouldEndSession);
    const requestType = handlerInput.requestEnvelope.request.type;

    const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession); // ses stands for shouldEndSession

    console.log('responseOutput:', JSON.stringify(responseOutput)); // logging where we are

    if(ses && !responseOutput.directives || requestType === 'SessionEndedRequest') { // 

    // if(shouldEndSession || requestType == 'SessionEndedRequest') {
      console.log('SessionWillEndInterceptor', 'end!');
      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const persistentAttributes = await attributesManager.getPersistentAttributes();
      
      persistentAttributes.profile = sessionAttributes.profile; // captures the full profile as opposed to the single entries captured above by the request interceptors
      persistentAttributes.recommendations = sessionAttributes.recommendations; // adds today's recommendations to previous recommendations 
      persistentAttributes.recommendations.current.meals = []; // captures the result of the interaction (recommendation)

      console.log(JSON.stringify(sessionAttributes));

      attributesManager.setPersistentAttributes(persistentAttributes); // this sets the information about the session ending as a bunch of persistent attributes
      attributesManager.savePersistentAttributes(persistentAttributes); // this saves the information about the session ending as a bunch of persistent attributes
    }
  }
};

/* CONSTANTS */

const permissions = ['read::alexa:device:all:address']; // required in both launch requests and HasConsentTokenRequestInterceptor. In other words, everywhere where account linking is used.

const requiredSlots = { // defines whether the slots are required to fulfill the intent or not. Not sure why this needs to be hard-coded here, as it's already defined in the console. 
  allergies: true,
  meal: true,
  cuisine: true,
  diet: true,
  deliveryOption: true,
  timeOfDay: true
};

/* HELPER FUNCTIONS */

function initializeProfile() { // this tells us exactly what needs to be part of the profile
  return {
    name: "",
    allergies: "",
    diet: "",
    location: {
        address: {
            city: "",
            state: "",
            zip: ""
        },
        timezone: ""
    }
  };
}

function initializeRecommendations() { // this tells us that the recommendation will mention what was recommended last time but also what meals and restaurants were suggested today
  return {
    previous: {
        meal: "",
        restaurant: ""
    },
    current: {
        meals: [],
        restaurants: []
    }
  };
}


function getWelcomeMessage(sessionAttributes) { // gets the welcome message based upon the context of the skill. 

  let speechText = "";

  if (sessionAttributes.isNew) { // welcomeMessage for first time users
    speechText += "<say-as interpret-as=\"interjection\">Howdy!</say-as> ";
    speechText += "Welcome to The Foodie! ";
    speechText += "I'll help you find the right food right now. ";
    speechText += "To make that easier, you can give me permission to access your location, ";
    speechText += "just check the Alexa app. ";
  } else {
    speechText += "Welcome back!! "; // welcomeMessage for repeat users

    const timeOfDay = sessionAttributes.timeOfDay;
    if (timeOfDay) {
      speechText += getTimeOfDayMessage(timeOfDay);
    } else {
      speechText += "It's time to stuff your face with delicious food. ";
    }
    
    if (sessionAttributes.recommendations.previous.meal) {
      speechText += "It looks like last time you had " + sessionAttributes.recommendations.previous.meal + ". ";
      speechText += "I wonder what it will be today. ";
    }
    
  }
  return speechText;
}

function getTimeOfDayMessage(timeOfDay) { // tailors the message to the time of day if time of day was established
  const messages = timeOfDayMessages[timeOfDay];
  return randomPhrase(messages);
  
}

function randomPhrase(phraseList) { // gives us options from an array of phrases
  let i = Math.floor(Math.random() * phraseList.length);
  return(phraseList[i]);
}

const timeOfDayMessages = { // welcome message is tailored to time of day
  breakfast: [
    "It looks like it's breakfast. ",
    "<say-as interpret-as=\"interjection\">cock a doodle doo</say-as> It's time for breakfast. ", 
    "Good morning! Time for breakfast"

  ],
  brunch: [
    "<say-as interpret-as=\"interjection\">cock a doodle doo</say-as> Let's get some brunch! ", 
    "It's time for brunch. "
  ],
  lunch: [
    "Lunch time! ",
    "Time for lunch. "
  ],
  dinner: [
    "It's dinner time. ",
    "It's supper time. "
  ],
  midnight: [
    "<say-as interpret-as=\"interjection\">wowza</say-as> You're up late! You looking for a midnight snack? ",
    "It's time for a midnight snack. "
  ]
};

function getPrompt(sessionAttributes) {

  let speechText =  "How rude of me. I forgot to ask. What's your name?"; 
  if (!sessionAttributes.isNew) { // first time users are asked for their name, repeat users not
    speechText = "Let's narrow it down. What flavors do you feel like? You can say things like spicy, savory, greasy, and fresh."; // asks for flavors
  }

  return speechText;
}

function getSlotValues(slots) { // part of all intents and interceptors where slot info needs to be provided

  const slotValues = {};

  for (let key in slots) {

      if (slots.hasOwnProperty(key)) { // not sure what this means

          slotValues[key] = {
              synonym: slots[key].value || null ,
              resolvedValues: (slots[key].value ? [slots[key].value] : []),
              statusCode: null,
          };
          
          let statusCode = (((((slots[key] || {} )
              .resolutions || {})
              .resolutionsPerAuthority || [])[0] || {} )
              .status || {})
              .code;

          let authority = ((((slots[key] || {})
              .resolutions || {})
              .resolutionsPerAuthority || [])[0] || {})
              .authority;

          slotValues[key].authority = authority;
          
          // any value other than undefined then entity resolution was successful
          if (statusCode) {
              slotValues[key].statusCode = statusCode;
              
              // we have resolved value(s)!
              if (slots[key].resolutions.resolutionsPerAuthority[0].values) {
                  let resolvedValues = slots[key].resolutions.resolutionsPerAuthority[0].values;
                  slotValues[key].resolvedValues = [];
                  for (let i = 0; i < resolvedValues.length; i++) {                   
                      slotValues[key].resolvedValues.push({
                          value: resolvedValues[i].value.name,
                          id: resolvedValues[i].value.id 
                      });
                  }
              }
          }
      }
  }
  return slotValues;
}

function getNewSlots(previous, current) { // if no old slots are found this kicks in
  const previousSlotValues = getSlotValues(previous);
  const currentSlotValues = getSlotValues(current);

  let newlyCollectedSlots = {};
  for(let slotName in previousSlotValues) { // loops through all the newly provided slots until they've all been captured

      if (previousSlotValues[slotName].synonym !== currentSlotValues[slotName].synonym){
          newlyCollectedSlots[slotName] = currentSlotValues[slotName];
      }
  }
  return newlyCollectedSlots;
}


function intentHasNewlyFilledSlots(previous, intent, slots) { // once it has been established that new slots were provided this kicks in, though not sure exactly what this does

  let newSlots;

  if (!previous) { // if there are no previous slots then this happens
    const slotValues = getSlotValues(intent.slots);
    newSlots = {};
    for (let slotName in slotValues) {
      if (slotValues[slotName].synonym) {
        newSlots[slotName] = slotValues[slotName]; // new slots are set equal to slot values
      }
    }
  } else {
    newSlots = getNewSlots(previous.slots, intent.slots); // not sure why this is included. If it's not new what is it doing in this helper function? 
  }

  const results = {
    found: false,
    slots: {}
  };
  
  slots.forEach(slot => { // loops through each slot and if there's anything new it captures the result of those new slots
    if(newSlots[slot]) {
      results.slots[slot] = newSlots[slot];
      results.found = true;
    }
  });
  return results;
}

function buildDisambiguationPrompt(resolvedValues) { // if not all required slots have been filled this creates the speech output 
  let output = "Which would you like";
  resolvedValues.forEach((resolvedValue, index) => {
     output +=  `${(index === resolvedValues.length - 1) ? ' or ' : ' '}${resolvedValue.value}`; 
  });
  output += "?";
  return output;
}

function disambiguateSlot(slots) { // determines which the missing slots are 
  let result;
  for(let slotName in slots) {
      if (slots[slotName].resolvedValues.length > 1 && requiredSlots[slotName]) {
          console.log('disambiguate:', slots[slotName]);
          result = {
              slotName: slotName,
              prompt: buildDisambiguationPrompt(slots[slotName].resolvedValues)
          };
          break;
      }
  }
  return result;
}

function intentSlotsHaveBeenFilled(intent, slots){ // have all the slots been filled in a given intent's array? Returns true or false. 
  const slotValues = getSlotValues(intent.slots);
  console.log('slot values:', JSON.stringify(slotValues));
  let result = true;
  slots.forEach(slot => {
      console.log('intentSlotsHaveBeenFilled:', slot);
      if (!slotValues[slot].synonym) {
          result = false;
      }
  });

  return result;
}

function intentSlotsNeedDisambiguation(intent, slots) { // tells us which slots have been filled
  const slotValues = getSlotValues(intent.slots);
  let result = false;
  slots.forEach(slot => {
    console.log(slotValues[slot].resolvedValues.length);
    if(slotValues[slot].resolvedValues.length > 1) {
      result = true;
    }
  });
  console.log("intentSlotsNeedDisambiguation", result);
  return result;
}

function getCurrentTime(location) { // gets the time at the user's location using the MomentsJS module

  const currentTime = Moment.utc().tz(location); // utc and tz define the time zones
  return currentTime;
}

function getTimeOfDay(currentTime) { // determines based on the device location time if it's time for breakfast or dinner or something else
  const currentHour = currentTime.hours();
  const currentMinutes = currentTime.minutes();
  
  const weightedHour = (currentMinutes >= 45) ? currentHour + 1 : currentHour;
  
  let timeOfDay = "midnight";
  if (weightedHour >= 6 && weightedHour <= 10) {
    timeOfDay = "breakfast";
  } else if (weightedHour == 11) {
    timeOfDay = "brunch";
  } else if (weightedHour >= 12 && weightedHour <= 16) {
    timeOfDay = "lunch";
  } else if (weightedHour >= 17 && weightedHour <= 23) {
    timeOfDay = "dinner";
  }
  return timeOfDay;
}

const skillBuilder = Alexa.SkillBuilders.standard(); // will define the features that the skill has in the handlers and interceptors listed below

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestWithConsentTokenHandler, // starts up the skill for users who have already linked their accounts
    LaunchRequestHandler, // starts up the skill for unlinked accounts
    SuggestMealRecommendationIntentHandler, // suggests meal options depending on the info received
    // promptForDeliveryOption,
    SIPRecommendationIntentHandler, // provides a reprompt if not all mandatory slots have been filled   
    CRecommendationIntentHandler, //
    LookupRestaurantIntentHandler, // looks up restaurants tailored to the user's stated preferences
    // GetMealIntentHandler,
    InProgressHasZipCaptureAddressIntentHandler, // attempts to capture zip
    InProgressHasCityStateCaptureAddressIntentHandler, // attempts to capture city & state
    InProgressCaptureAddressIntentHandler, // captures the whole address
    HelpIntentHandler, // gives guidance if the user asks for help
    CancelAndStopIntentHandler, // shuts down the skill
    SessionEndedRequestHandler // finishes up everything, a bit like cleaning and then locking a store
  )
  .addRequestInterceptors( // request interceptors need to be registered just like handlers as well
    NewSessionRequestInterceptor, // determines if the user has a profile or not
    SetTimeOfDayInterceptor, // determines the time of day based on device location
    HasConsentTokenRequestInterceptor, // determines whether the user has given permission to link account and provide device location
    RecommendationIntentStartedRequestInterceptor, // starts the user profile
    RecommendationIntentCaptureSlotToProfileInterceptor, // transfers recommendations to profile
    CaptureAddressIntentCaptureSlotsToProfileInterceptor, // transfers address to profile
    DialogManagementStateInterceptor // transfers sessionAttributes from currentIntent to persistentAttributes
  )
  .addResponseInterceptors(SessionWillEndInterceptor) // make sure to not confuse request and response interceptors
  .addErrorHandlers(ErrorHandler) // not sure why the error handler is not just registered above with all the other handlers
  //.withPersistenceAdapter()
  //.withApiClient(new Alexa.DefaultApiClient())
  .withAutoCreateTable(true) // will create a new DynamoDB table if it doesn't already exist
  .withTableName("theFoodie") // name of DynamodB table
  .lambda(); // uses the AWS lambda service


  //   Questions: 


//   defines whether the slots are required to fulfill the intent or not. Not sure why this needs to be hard-coded here, as it's already defined in the console. 
//   not sure why the object called responseBuilder is set equal to the handler output 
//   .addElicitSlotDirective("deliveryOption") // not sure why it doesn't include all the slots that are being elicited but only the deliveryOption
//   What's the difference between an error message and an error stack? 
//   What is the difference between a response and a request interceptor? 
//   What does the process keyword/method do? 
//   How does the saveNewlyFilledSlotsToSessionAttributes interceptor interact with other aspects of persistence? 
//   if (currentIntentSlots[key].value && !currentIntent.slots[key].value) { // don't know what this does exactly
//   currentIntent.slots[key] = currentIntentSlots[key]; // don't know what this does exactly
//   getSlotValues is a function I don't understand at all how it works. I see the lines but I dont' understand what it means. 



//   Learnings: 
//   What is in the request envelope? Contains the incoming Request and other context.
//   What does the SIPRecommendationIntentHandler do exactly? It figures out if all the required slots are filled thanks to the disambiguate helper functions.   
//   it's super obvious but if I want to know exactly what aspects are in the sessionAttributes or in the requestEnvelope or wherever I can just log those things
//   seems a bit generic, shouldn't it be addressIntent or some specified name? --> no. This allows this code to be re-usable in different intents.
//   what is currentIntent is needed for? When we're collecting slots the program needs to know where we are. In case there is an interruption slots from the currentIntent get transferred to the profile where they can later by found again. 
//   Is interceptor just a fancy name for helper function? No, there are a bunch of helper functions which mainly initialize stuff or provide messages. Interceptors are more complex and cover quite a bit of logic. Helper functions are used within interceptors. 
//   How are interceptors related to each other? They can be linked but don't have to be, as they are perfectly capable of standing alone. Linked interceptors might perform sequential tasks whereas some interceptors share an activity such as initializing a process. 
//   how does this address interceptor relate to other address functions above? My guess is that the handlers just query address details whereas the interceptors actually add them to the profile. 
//   What is disambiguation? I think it means that not all slots have been filled and some kind of reprompt is necessary to fill all required slots. 
//   not sure what the difference is between the getNewSlots function and the gotSlotsValues function --> 
        // intentHasNewlyFilledSlots given a previous and current intent and a set of 
        // slots, this function will compare the previous intent's slots with current 
        // intent's slots to determine what's new. The results are filtered by the 
        // provided array of "slots". For example if you wanted to determine if there's
        // a new value for the "state" and "city" slot you would pass the previous and
        // current intent and an array containing both strings. If previous is undefined,
        // all filled slots are treated as newly filled. 
        // Returns: 
        // {
        //   found: (true | false)
        //   slots: object of slots returned from getSlots
        // }









