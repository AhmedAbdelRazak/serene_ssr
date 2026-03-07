import React from "react";

export default function SVGManSittingOnChair() {
	return (
		<svg
			width='200'
			height='220'
			viewBox='0 0 200 220'
			xmlns='http://www.w3.org/2000/svg'
			style={{ background: "#fff" }}
		>
			{/* -- CHAIR BACK (dark brown) -- */}
			<path
				d='
          M80,60
          L115,60
          C120,60 125,80 125,100
          L115,100
          L80,100
          Z
        '
				fill='#5b392d'
			/>

			{/* -- CHAIR SEAT (brown) -- */}
			<path
				d='
          M80,100
          L125,100
          L130,110
          L85,110
          Z
        '
				fill='#6f4539'
			/>

			{/* -- CHAIR LEGS (metallic) -- */}
			{/* Rear leg */}
			<path
				d='
          M85,110
          L80,160
          L85,160
          L90,110
          Z
        '
				fill='#7a8c94'
			/>
			{/* Front leg */}
			<path
				d='
          M130,110
          L125,160
          L130,160
          L135,110
          Z
        '
				fill='#7a8c94'
			/>

			{/* -- TORSO (red shirt) -- */}
			<path
				d='
          M90,80
          C90,72 105,72 105,80
          L105,115
          C105,122 90,122 90,115
          Z
        '
				fill='#e44b4b'
				transform='rotate(-5, 97.5, 95)'
			/>

			{/* -- RIGHT SHOULDER/ARM (slightly extended) -- */}
			<path
				d='
          M105,84
          C107,88 110,95 110,100
          L110,107
          C110,110 107,112 105,112
          L102,112
          C103,105 103,95 101,88
          Z
        '
				fill='#f2c79f'
				transform='rotate(-5, 105, 95)'
			/>

			{/* -- LEFT SHOULDER/ARM (down by side) -- */}
			<path
				d='
          M90,84
          C88,90 86,97 86,104
          L86,110
          C86,112 89,114 91,114
          L93,114
          C92,105 92,95 94,88
          Z
        '
				fill='#f2c79f'
				transform='rotate(-5, 90, 95)'
			/>

			{/* -- PANTS (dark gray) -- */}
			{/* Left leg (our left, character's right) */}
			<path
				d='
          M90,115
          L95,115
          C100,130 100,140 98,150
          L95,150
          C93,140 90,130 90,115
        '
				fill='#333'
				transform='rotate(-5, 95, 133)'
			/>
			{/* Right leg (slightly forward) */}
			<path
				d='
          M100,115
          L105,115
          C110,135 110,145 108,155
          L105,155
          C103,145 100,135 100,115
        '
				fill='#333'
				transform='rotate(-2, 105, 135)'
			/>

			{/* -- SHOES (dark) -- */}
			<path
				d='M92,150 C96,149 99,152 95,154 L91,154 Z'
				fill='#000'
				transform='rotate(-5, 95, 152)'
			/>
			<path
				d='M103,155 C107,154 110,156 106,158 L102,158 Z'
				fill='#000'
				transform='rotate(-2, 105, 156)'
			/>

			{/* -- HEAD + NECK -- */}
			{/* Neck */}
			<rect
				x='95'
				y='70'
				width='8'
				height='8'
				fill='#f2c79f'
				transform='rotate(-5, 99, 74)'
			/>
			{/* Head (face) */}
			<circle
				cx='99'
				cy='60'
				r='10'
				fill='#f2c79f'
				transform='rotate(-5, 99, 60)'
			/>

			{/* -- HAIR (blond-ish) -- */}
			<path
				d='
          M89,52
          C90,45 110,45 108,52
          Q105,48 100,48
          Q95,48 92,52
          Z
        '
				fill='#d9a15f'
				transform='rotate(-5, 99, 52)'
			/>

			{/* -- SIMPLE FACE FEATURES -- */}
			{/* Eyes */}
			<circle
				cx='95'
				cy='58'
				r='1.5'
				fill='#333'
				transform='rotate(-5, 95, 58)'
			/>
			<circle
				cx='103'
				cy='57'
				r='1.5'
				fill='#333'
				transform='rotate(-5, 103, 57)'
			/>
			{/* Smile */}
			<path
				d='
          M93,63
          Q99,68 105,63
        '
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
				transform='rotate(-5, 99, 63)'
			/>
		</svg>
	);
}
