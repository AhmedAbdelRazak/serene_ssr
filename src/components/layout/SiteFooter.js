import Link from "next/link";

export default function SiteFooter() {
	return (
		<footer className='site-footer'>
			<div className='site-container site-footer-grid'>
				<div>
					<h3>Serene Jannat</h3>
					<p>Thoughtful gifts, handcrafted products, and premium print-on-demand.</p>
				</div>
				<div>
					<h4>Policies</h4>
					<ul>
						<li>
							<Link href='/privacy-policy-terms-conditions'>Privacy Policy</Link>
						</li>
						<li>
							<Link href='/cookie-policy'>Cookie Policy</Link>
						</li>
						<li>
							<Link href='/return-refund-policy'>Return & Refund Policy</Link>
						</li>
					</ul>
				</div>
				<div>
					<h4>Shop</h4>
					<ul>
						<li>
							<Link href='/our-products'>All Products</Link>
						</li>
						<li>
							<Link href='/custom-gifts'>Custom Gifts</Link>
						</li>
						<li>
							<Link href='/contact'>Contact</Link>
						</li>
					</ul>
				</div>
			</div>
		</footer>
	);
}

