import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
	{ href: "/", label: "Home" },
	{ href: "/our-products", label: "Products" },
	{ href: "/custom-gifts", label: "Print on Demand" },
	{ href: "/about", label: "About" },
	{ href: "/contact", label: "Contact Us" },
];

export default function SiteHeader() {
	return (
		<header className='site-header'>
			<div className='site-header-top'>
				<div className='site-container site-header-top-inner'>
					<Link href='/' className='brand-wrap'>
						<div className='brand-logo'>
							<Image
								src='/logo192.png'
								alt='Serene Jannat'
								width={44}
								height={44}
								priority
								unoptimized
							/>
						</div>
						<div className='brand-copy'>
							<span className='brand-title'>Serene Jannat</span>
							<span className='brand-subtitle'>Harmonious Glow, Natural Bliss</span>
						</div>
					</Link>
					<div className='header-links'>
						<Link href='/signin'>Sign In</Link>
						<Link href='/cart'>Cart</Link>
					</div>
				</div>
			</div>
			<nav className='site-nav'>
				<div className='site-container site-nav-inner'>
					{NAV_ITEMS.map((item) => (
						<Link key={item.href} href={item.href}>
							{item.label}
						</Link>
					))}
				</div>
			</nav>
		</header>
	);
}
