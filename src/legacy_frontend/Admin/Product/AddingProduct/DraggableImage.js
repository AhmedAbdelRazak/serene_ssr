import React from "react";
import { useDrag, useDrop } from "react-dnd";

const ItemTypes = {
	IMAGE: "image",
};

const DraggableImage = ({
	image,
	index,
	moveImage,
	handleImageRemove,
	multipleImages,
}) => {
	const ref = React.useRef(null);

	const [, drop] = useDrop({
		accept: ItemTypes.IMAGE,
		hover(item) {
			if (!ref.current) {
				return;
			}
			const dragIndex = item.index;
			const hoverIndex = index;

			if (dragIndex === hoverIndex) {
				return;
			}

			moveImage(dragIndex, hoverIndex);
			item.index = hoverIndex;
		},
	});

	const [{ isDragging }, drag] = useDrag({
		type: ItemTypes.IMAGE,
		item: { index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	drag(drop(ref));

	return (
		<div
			ref={ref}
			className='image-wrapper'
			style={{
				opacity: isDragging ? 0.5 : 1,
				cursor: "move",
			}}
		>
			<button
				type='button'
				className='close-btn'
				onClick={() => handleImageRemove(image.public_id)}
				style={{
					transform: "translate(-100%, -100%)",
					color: "white",
					background: "black",
					fontSize: "15px",
					padding: "0px",
					borderRadius: "50%",
				}}
				aria-label='Close'
			>
				<span aria-hidden='true'>&times;</span>
			</button>
			<img
				src={image.url}
				alt='Img Not Found'
				style={{
					width: multipleImages ? "100px" : "150px",
					height: multipleImages ? "100px" : "150px",
				}}
			/>
		</div>
	);
};

export default DraggableImage;
