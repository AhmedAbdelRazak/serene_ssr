/** @format */

import React from "react";
import styled from "styled-components";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import imageImage from "../../../GeneralImages/UploadImageImage.jpg";

const resolveAssetSrc = (asset) =>
	typeof asset === "string" ? asset : asset?.src || "";

const ItemTypes = {
	IMAGE: "image",
};

const DraggableImage = ({
	image,
	index,
	moveImage,
	handleImageRemove,
	multipleImages,
	productAttributesFinal,
	setProductAttributesFinal,
	i,
}) => {
	const ref = React.useRef(null);

	const [{ isDragging }, drag] = useDrag({
		type: ItemTypes.IMAGE,
		item: { index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	const [, drop] = useDrop({
		accept: ItemTypes.IMAGE,
		hover: (draggedItem, monitor) => {
			if (!ref.current) {
				return;
			}

			const dragIndex = draggedItem.index;
			const hoverIndex = index;

			// Don't replace items with themselves
			if (dragIndex === hoverIndex) {
				return;
			}

			// Determine rectangle on screen
			const hoverBoundingRect = ref.current?.getBoundingClientRect();

			// Get vertical middle
			const hoverMiddleX =
				(hoverBoundingRect.right - hoverBoundingRect.left) / 2;

			// Determine mouse position
			const clientOffset = monitor.getClientOffset();

			// Get pixels to the left
			const hoverClientX = clientOffset.x - hoverBoundingRect.left;

			// Only perform the move when the mouse has crossed half of the items width
			// When dragging to the right, only move when the cursor is past 50%
			// When dragging to the left, only move when the cursor is before 50%
			// Dragging right
			if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
				return;
			}
			// Dragging left
			if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
				return;
			}

			// Time to actually perform the action
			moveImage(dragIndex, hoverIndex);

			// Note: we're mutating the monitor item here!
			// Generally it's better to avoid mutations,
			// but it's good here for the sake of performance to avoid expensive index searches.
			draggedItem.index = hoverIndex;
		},
	});

	drag(drop(ref));

	return (
		<div
			ref={ref}
			className='image-wrapper'
			style={{
				opacity: isDragging ? 0.5 : 1,
				zIndex: isDragging ? 1000 : "auto",
			}}
		>
			<button
				type='button'
				className='close-btn'
				onClick={() => {
					handleImageRemove(image.public_id);

					var array = productAttributesFinal[i].productImages.filter(
						function (s) {
							return s !== image;
						}
					);

					const index = productAttributesFinal.findIndex((object) => {
						return object.PK === productAttributesFinal[i].PK;
					});

					if (index !== -1) {
						const newArr = productAttributesFinal.map((obj) => {
							if (obj.PK === productAttributesFinal[i].PK) {
								return {
									...obj,
									productImages: array,
								};
							}

							return obj;
						});

						setProductAttributesFinal(newArr);
					}
				}}
			>
				<span aria-hidden='true'>&times;</span>
			</button>
			<img
				src={image.url}
				alt='Img Not Found'
				className='image'
				style={{
					width: multipleImages ? "100px" : "150px",
					height: multipleImages ? "100px" : "150px",
				}}
			/>
		</div>
	);
};

const MultipleImageCard = ({
	productAttributesFinal,
	handleImageRemove,
	allColors,
	ColorsImageUpload,
	c,
	i,
	setProductAttributesFinal,
}) => {
	const placeholderSrc = resolveAssetSrc(imageImage);

	const moveImage = (fromIndex, toIndex) => {
		const items = Array.from(productAttributesFinal[i].productImages);
		const [movedItem] = items.splice(fromIndex, 1);
		items.splice(toIndex, 0, movedItem);

		const newArr = productAttributesFinal.map((obj) => {
			if (obj.PK === productAttributesFinal[i].PK) {
				return {
					...obj,
					productImages: items,
				};
			}
			return obj;
		});

		setProductAttributesFinal(newArr);
	};

	const multipleImages =
		productAttributesFinal[i] &&
		productAttributesFinal[i].productImages &&
		productAttributesFinal[i].productImages.length > 1;

	return (
		<DndProvider backend={HTML5Backend}>
			<MultipleImageCardWrapper>
				<div className='card card-flush py-4'>
					<div className=''>
						<div className=' p-3'>
							<h5 style={{ fontWeight: "bold", fontSize: "1.05rem" }}>
								Product Images{" "}
								<span className='text-capitalize'>
									(
									{allColors &&
										allColors[0] &&
										allColors[allColors.map((i) => i.hexa).indexOf(c)].color}
									)
								</span>
							</h5>
						</div>
					</div>
					<div className='card-body text-center pt-0'>
						<div
							className='image-input image-input-empty image-input-outline image-input-placeholder mb-3'
							data-kt-image-input='true'
						>
							<div className='image-input-wrapper w-180px h-180px'></div>

							{productAttributesFinal[i] &&
							productAttributesFinal[i].productImages &&
							productAttributesFinal[i].productImages.length > 0 ? (
								<div className='image-container'>
									{productAttributesFinal[i].productImages.map(
										(imag, index) => (
											<DraggableImage
												key={imag.public_id}
												image={imag}
												index={index}
												moveImage={moveImage}
												handleImageRemove={handleImageRemove}
												multipleImages={multipleImages}
												productAttributesFinal={productAttributesFinal}
												setProductAttributesFinal={setProductAttributesFinal}
												i={i}
											/>
										)
									)}
								</div>
							) : null}
							<br />
							<br />
							{productAttributesFinal[i] &&
							productAttributesFinal[i].productImages &&
							productAttributesFinal[i].productImages.length <= 0 ? (
								<label
									className='btn btn-raised'
									style={{
										cursor: "pointer",
										fontSize: "0.95rem",
										backgroundColor: c,
										color: "white",
										boxShadow: "2px 2px 2px 3px rgba(0,0,0,0.1)",
									}}
								>
									<img src={placeholderSrc} alt='imageUpload' />
									<input
										type='file'
										hidden
										multiple
										accept='images/*'
										onChange={(e) => ColorsImageUpload(e, c)}
										required
									/>
								</label>
							) : null}
						</div>
						<div className='text-muted fs-7'>
							Width: 1200px, Height: 1220px;
							<br />
							Set the product thumbnail image. Only *.png, *.jpg and *.jpeg
							image files are accepted
						</div>
					</div>
				</div>
			</MultipleImageCardWrapper>
		</DndProvider>
	);
};

export default MultipleImageCard;

const MultipleImageCardWrapper = styled.div`
	.card {
		border: 1px white solid !important;
	}

	.image-container {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.image-wrapper {
		position: relative;
		margin: 5px;
		transition: transform 0.3s ease-in-out; /* Add smooth transition */
	}

	.close-btn {
		position: absolute;
		top: -8px;
		right: -8px;
		background-color: #e74c3c; /* Reddish background */
		color: white;
		font-size: 16px;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.image {
		box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, 0.2);
	}

	.image:hover {
		cursor: pointer;
	}
`;
