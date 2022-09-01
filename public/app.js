paypal
  .Buttons({
    // Sets up the transaction when a payment button is clicked
    createOrder: function (data, actions) {
      return fetch("/api/orders", {
        method: "post",
        // use the "body" param to optionally pass additional order information
        // like product ids or amount
      })
        .then((response) => response.json())
        .then((order) => order.id);
    },
    // Finalize the transaction after payer approval
    onApprove: function (data, actions) {
      return fetch(`/api/orders/${data.orderID}/capture`, {
        method: "post",
      })
        .then((response) => response.json())
        .then((orderData) => {
          // Successful capture! For dev/demo purposes:
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2)
          );
          var transaction = orderData.purchase_units[0].payments.captures[0];
          alert(`Transaction ${transaction.status}: ${transaction.id}

            See console for all available details
          `);
          // When ready to go live, remove the alert and show a success message within this page. For example:
          // var element = document.getElementById('paypal-button-container');
          // element.innerHTML = '<h3>Thank you for your payment!</h3>';
          // Or go to another URL:  actions.redirect('thank_you.html');
        });
    },
  })
  .render("#paypal-button-container");

// If this returns false or the card fields aren't visible, see Step #1.
//console.log("eligibility: ", paypal.HostedFields.isEligible())
if (paypal.HostedFields.isEligible()) {
  let orderId;

  // Renders card fields
  paypal.HostedFields.render({
    // Call your server to set up the transaction
    createOrder: () => {
      return fetch("/api/orders", {
        method: "post",
        // use the "body" param to optionally pass additional order information like
        // product ids or amount.
      })
        .then((res) => res.json())
        .then((orderData) => {
          orderId = orderData.id; // needed later to complete capture
          return orderData.id;
        });
    },
    styles: {
      ".valid": {
        color: "green",
      },
      ".invalid": {
        color: "red",
      },
    },
    fields: {
      number: {
        selector: "#card-number",
        placeholder: "4111 1111 1111 1111",
      },
      cvv: {
        selector: "#cvv",
        placeholder: "123",
      },
      expirationDate: {
        selector: "#expiration-date",
        placeholder: "MM/YY",
      },
    },
  }).then((cardFields) => {
    document.querySelector("#card-form").addEventListener("submit", (event) => {
      event.preventDefault();
      cardFields
        .submit({
          //Triggering 3DS
          contingencies: ["SCA_ALWAYS"],
          cardholderName: document.getElementById("card-holder-name").value,
          // Billing Address
          billingAddress: {
            // Street address, line 1
            streetAddress: document.getElementById(
              "card-billing-address-street"
            ).value,
            // Street address, line 2 (Ex: Unit, Apartment, etc.)
            extendedAddress: document.getElementById(
              "card-billing-address-unit"
            ).value,
            // State
            region: document.getElementById("card-billing-address-state").value,
            // City
            locality: document.getElementById("card-billing-address-city")
              .value,
            // Postal Code
            postalCode: document.getElementById("card-billing-address-zip")
              .value,
            // Country Code
            countryCodeAlpha2: document.getElementById(
              "card-billing-address-country"
            ).value,
          },
        })

        //handling 3DS
        .then(function () {
          //console.log("CardFields: ", cardFields);
          return fetch(`/api/orders/${orderId}`, {
            method: "get",
          })
            .then((res) => res.json())
            .then((challengeData) => {
              console.log(
                "Challenge data: ",
                challengeData,
                JSON.stringify(challengeData, null, 2)
              );
              //can handle different responses here depending on three_d_secure.authentication_status
              //need to also handle liability_shift="NO" and NO enrollment_status & authentication_status when
              //the cardinal api is down
              switch (
                challengeData.payment_source.card.authentication_result
                  .three_d_secure.enrollment_status
              ) {
                case "Y":
                  switch (
                    challengeData.payment_source.card.authentication_result
                      .three_d_secure.authentication_status
                  ) {
                    case "Y":
                      console.log(
                        "Preparing to capture order with orderId: ",
                        orderId
                      );
                      //Calling the /orders/:orderId/capture API
                      return fetch(`/api/orders/${orderId}/capture`, {
                        method: "post",
                      })
                        .then((res) => res.json())
                        .then((orderData) => {
                          console.log("This is the orderData: ", orderData);
                          if (
                            orderData.purchase_units[0].payments.captures[0]
                              .status === "COMPLETED"
                          ) {
                            alert("Transaction completed!");
                          } else {
                            var errorDetail =
                              Array.isArray(orderData.details) &&
                              orderData.details[0];
                            if (
                              errorDetail &&
                              errorDetail.issue === "INSTRUMENT_DECLINED"
                            ) {
                              return actions.restart();
                            }
                            if (errorDetail) {
                              var msg =
                                "Sorry, your transaction could not be processed.";
                              if (errorDetail.description)
                                msg += "\n\n" + errorDetail.description;
                              if (orderData.debug_id)
                                msg += " (" + orderData.debug_id + ")";
                              return alert(msg); // Show a failure message
                            }
                          }
                        });
                      break;
                    case "A":
                      console.log(
                        "Preparing to capture order with orderId: ",
                        orderId
                      );
                      //Calling the /orders/:orderId/capture API
                      return fetch(`/api/orders/${orderId}/capture`, {
                        method: "post",
                      })
                        .then((res) => res.json())
                        .then((orderData) => {
                          console.log("This is the orderData: ", orderData);
                          var errorDetail =
                            Array.isArray(orderData.details) &&
                            orderData.details[0];
                          if (
                            errorDetail &&
                            errorDetail.issue === "INSTRUMENT_DECLINED"
                          ) {
                            return actions.restart();
                          }
                          if (errorDetail) {
                            var msg =
                              "Sorry, your transaction could not be processed.";
                            if (errorDetail.description)
                              msg += "\n\n" + errorDetail.description;
                            if (orderData.debug_id)
                              msg += " (" + orderData.debug_id + ")";
                            return alert(msg); // Show a failure message
                          }

                          alert("Transaction completed!");
                        });
                      break;
                    case "N":
                      alert("3DS Failed Authentication, try again");
                      break;
                    case "R":
                      alert("3DS was rejected, try again");
                      break;
                    case "U":
                      alert("Please try again");
                      break;
                    case "C":
                      alert("Please try again");
                      break;
                    default:
                      alert("Please try again"); //this is enrollment Y, authentication none
                  }
                  break;
                case "N":
                  console.log(
                    "Preparing to capture order with orderId: ",
                    orderId
                  );
                  //Calling the /orders/:orderId/capture API
                  return fetch(`/api/orders/${orderId}/capture`, {
                    method: "post",
                  })
                    .then((res) => res.json())
                    .then((orderData) => {
                      console.log("This is the orderData: ", orderData);
                      var errorDetail =
                        Array.isArray(orderData.details) &&
                        orderData.details[0];
                      if (
                        errorDetail &&
                        errorDetail.issue === "INSTRUMENT_DECLINED"
                      ) {
                        return actions.restart();
                      }
                      if (errorDetail) {
                        var msg =
                          "Sorry, your transaction could not be processed.";
                        if (errorDetail.description)
                          msg += "\n\n" + errorDetail.description;
                        if (orderData.debug_id)
                          msg += " (" + orderData.debug_id + ")";
                        return alert(msg); // Show a failure message
                      }

                      alert("Transaction completed!");
                    });
                  break;
                case "U":
                  if (
                    challengeData.payment_source.card.authentication_result
                      .liability_shift === "NO"
                  ) {
                    console.log(
                      "Preparing to capture order with orderId: ",
                      orderId
                    );
                    //Calling the /orders/:orderId/capture API
                    return fetch(`/api/orders/${orderId}/capture`, {
                      method: "post",
                    })
                      .then((res) => res.json())
                      .then((orderData) => {
                        console.log("This is the orderData: ", orderData);
                        var errorDetail =
                          Array.isArray(orderData.details) &&
                          orderData.details[0];
                        if (
                          errorDetail &&
                          errorDetail.issue === "INSTRUMENT_DECLINED"
                        ) {
                          return actions.restart();
                        }
                        if (errorDetail) {
                          var msg =
                            "Sorry, your transaction could not be processed.";
                          if (errorDetail.description)
                            msg += "\n\n" + errorDetail.description;
                          if (orderData.debug_id)
                            msg += " (" + orderData.debug_id + ")";
                          return alert(msg); // Show a failure message
                        }

                        alert("Transaction completed!");
                      });
                  } else if (
                    challengeData.payment_source.card.authentication_result
                      .liability_shift === "UNKNOWN"
                  ) {
                    alert("Please try again");
                  }
                  break;
                case "B":
                  if (
                    challengeData.payment_source.card.authentication_result
                      .liability_shift === "NO"
                  ) {
                    console.log(
                      "Preparing to capture order with orderId: ",
                      orderId
                    );
                    //Calling the /orders/:orderId/capture API
                    return fetch(`/api/orders/${orderId}/capture`, {
                      method: "post",
                    })
                      .then((res) => res.json())
                      .then((orderData) => {
                        console.log("This is the orderData: ", orderData);
                        var errorDetail =
                          Array.isArray(orderData.details) &&
                          orderData.details[0];
                        if (
                          errorDetail &&
                          errorDetail.issue === "INSTRUMENT_DECLINED"
                        ) {
                          return actions.restart();
                        }
                        if (errorDetail) {
                          var msg =
                            "Sorry, your transaction could not be processed.";
                          if (errorDetail.description)
                            msg += "\n\n" + errorDetail.description;
                          if (orderData.debug_id)
                            msg += " (" + orderData.debug_id + ")";
                          return alert(msg); // Show a failure message
                        }

                        alert("Transaction completed!");
                      });
                  }
                  break;
                default:
                  if (
                    challengeData.payment_source.card.authentication_result
                      .liability_shift === "UNKNOWN"
                  ) {
                    alert("Please try again");
                  }
              }
            });
        })
        .catch((err) => {
          console.log("Errors: ", err);
          alert("Payment could not be captured! " + JSON.stringify(err));
        });
    });
  });
} else {
  // Hides card fields if the merchant isn't eligible
  document.querySelector("#card-form").style = "display: none";
}
