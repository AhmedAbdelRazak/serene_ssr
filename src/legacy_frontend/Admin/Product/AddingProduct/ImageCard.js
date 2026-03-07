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
}) => {
	// eslint-disable-next-line
	const [{ isDragging }, ref, preview] = useDrag({
		type: ItemTypes.IMAGE,
		item: { index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	const [, drop] = useDrop({
		accept: ItemTypes.IMAGE,
		hover: (draggedItem) => {
			if (draggedItem.index !== index) {
				moveImage(draggedItem.index, index);
				draggedItem.index = index;
			}
		},
	});

	return (
		<div
			ref={(node) => ref(drop(node))}
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

const ImageCard = ({
	setAddThumbnail,
	handleImageRemove,
	addThumbnail,
	fileUploadAndResizeThumbNail,
	uploadFrom,
}) => {
	const placeholderSrc = resolveAssetSrc(imageImage);

	const multipleImages =
		addThumbnail && addThumbnail.images && addThumbnail.images.length > 1;

	const moveImage = (fromIndex, toIndex) => {
		const items = Array.from(addThumbnail.images);
		const [movedItem] = items.splice(fromIndex, 1);
		items.splice(toIndex, 0, movedItem);

		setAddThumbnail((prevState) => ({
			...prevState,
			images: items,
		}));
	};

	return (
		<DndProvider backend={HTML5Backend}>
			<ImageCardWrapper>
				<div className='card card-flush py-4'>
					<div className=''>
						<div className='p-2'>
							<h5 style={{ fontWeight: "bold", fontSize: "1.05rem" }}>
								{uploadFrom === "BasicProduct"
									? "Product Images"
									: "Product Main Image"}
							</h5>
						</div>
					</div>
					<div className='card-body pt-0'>
						<div className='image-container'>
							{addThumbnail &&
								addThumbnail.images &&
								addThumbnail.images.map((image, index) => (
									<DraggableImage
										key={image.public_id}
										image={image}
										index={index}
										moveImage={moveImage}
										handleImageRemove={handleImageRemove}
										multipleImages={multipleImages}
									/>
								))}
						</div>
						{!addThumbnail.images || addThumbnail.images.length <= 0 ? (
							<label
								className='upload-label'
								style={{ cursor: "pointer", fontSize: "0.95rem" }}
							>
								<img
									src={placeholderSrc}
									alt='imageUpload'
									style={{
										width: "200px",
										height: "200px",
									}}
								/>
								<input
									type='file'
									multiple={uploadFrom === "BasicProduct"}
									hidden
									accept='images/*'
									onChange={fileUploadAndResizeThumbNail}
									required
								/>
							</label>
						) : null}
						<div className='text-muted fs-7'>
							Width: 1200px, Height: 1220px;
							<br />
							Set the product thumbnail image. Only *.png, *.jpg and *.jpeg
							image files are accepted
						</div>
					</div>
				</div>
			</ImageCardWrapper>
		</DndProvider>
	);
};

export default ImageCard;

const ImageCardWrapper = styled.div`
	.card {
		border: 1px white solid !important;
		max-width: 90%;
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

	.upload-label {
		display: flex;
		justify-content: center;
		align-items: center;
	}
`;
