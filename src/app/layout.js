import "./globals.css";
import "@/legacy_frontend/App.css";
import "@/legacy_frontend/slick-lite.css";
import "@/legacy_frontend/perf-overrides.css";
import ChromeShell from "@/components/layout/ChromeShell";
import AnalyticsScripts from "@/components/tracking/AnalyticsScripts";
import JsonLd from "@/components/seo/JsonLd";
import { createMetadata, organizationSchema } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Serene Jannat | Harmonious Glow, Natural Bliss",
	description:
		"Shop handcrafted decor and premium print-on-demand gifts with personalization for every occasion.",
	pathname: "/",
	keywords: [
		"Serene Jannat",
		"Print On Demand",
		"Custom Gifts",
		"Home Decor",
		"Personalized Gifts",
	],
});

export default function RootLayout({ children }) {
	return (
		<html lang='en'>
			<head>
				<link rel='preconnect' href='https://res.cloudinary.com' />
				<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
				<link
					rel='preload'
					as='style'
					href='https://fonts.googleapis.com/css2?family=Rastantly+Cortez&family=Montserrat:wght@400;700&family=Open+Sans&family=Great+Vibes&family=Allison&family=Allura&family=Dancing+Script&family=Lobster&display=swap'
				/>
				<link
					rel='stylesheet'
					href='https://fonts.googleapis.com/css2?family=Rastantly+Cortez&family=Montserrat:wght@400;700&family=Open+Sans&family=Great+Vibes&family=Allison&family=Allura&family=Dancing+Script&family=Lobster&display=swap'
					media='all'
				/>
				<link
					rel='preload'
					as='style'
					href='https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
					integrity='sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T'
					crossOrigin='anonymous'
				/>
				<link
					rel='stylesheet'
					href='https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
					integrity='sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T'
					crossOrigin='anonymous'
					media='all'
				/>
				<noscript>
					<link
						rel='stylesheet'
						href='https://fonts.googleapis.com/css2?family=Rastantly+Cortez&family=Montserrat:wght@400;700&family=Open+Sans&family=Great+Vibes&family=Allison&family=Allura&family=Dancing+Script&family=Lobster&display=swap'
					/>
					<link
						rel='stylesheet'
						href='https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css'
						integrity='sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T'
						crossOrigin='anonymous'
					/>
				</noscript>
				<meta
					name='facebook-domain-verification'
					content='ctdvedogjmpukl4fixfi03qzeax4w0'
				/>
			</head>
			<body>
				<AnalyticsScripts />
				<JsonLd data={organizationSchema()} />
				<ChromeShell>{children}</ChromeShell>
			</body>
		</html>
	);
}
