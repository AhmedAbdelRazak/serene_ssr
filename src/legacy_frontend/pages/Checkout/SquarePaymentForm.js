import React, { useState } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { toast } from "react-toastify";

const SquarePaymentForm = ({
	amount,
	currency,
	handlePaymentSuccess,
	zipCode,
	onError = () => {}, // Provide a default function if not passed
}) => {
	const applicationId = process.env.REACT_APP_SQUARE_APPLICATION_ID_TEST;
	const locationId = process.env.REACT_APP_SQUARE_LOCATION_ID_TEST; // Production or test location ID
	const [isProcessing, setIsProcessing] = useState(false);

	const cardTokenizeResponseReceived = async (tokenResult) => {
		if (tokenResult.status === "OK") {
			console.info("Token:", tokenResult.token);
			setIsProcessing(true);

			try {
				await handlePaymentSuccess(tokenResult.token);
			} catch (error) {
				toast.error("Payment failed, please try again.");
				console.error("Error processing payment:", error);
				onError();
			} finally {
				setIsProcessing(false);
			}
		} else {
			toast.error("Payment failed, please try another card.");
			console.error("Failed to tokenize card:", tokenResult.errors);
			onError();
		}
	};

	return (
		<PaymentForm
			applicationId={applicationId}
			locationId={locationId}
			cardTokenizeResponseReceived={cardTokenizeResponseReceived}
			createVerificationDetails={() => ({
				amount: amount.toString(),
				currencyCode: currency,
				intent: "CHARGE",
				billingContact: {
					postalCode: zipCode,
				},
			})}
		>
			<CreditCard disabled={isProcessing} />
		</PaymentForm>
	);
};

export default SquarePaymentForm;
