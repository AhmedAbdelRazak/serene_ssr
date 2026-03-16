import React, { useState, useEffect } from "react";
import styled from "styled-components";
import StarRating from "react-star-ratings";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { DeleteOutlined } from "@ant-design/icons";

const commentDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
	second: "2-digit",
});

function formatCommentDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return commentDateFormatter.format(date);
}

const CommentsAndRatings = ({ product, user, token }) => {
	const [star, setStar] = useState(0);
	const [comments, setComments] = useState([]);
	const [text, setText] = useState("");
	const isLeanBootstrap = product?.bootstrapMode === "lean";
	const safeRatings = Array.isArray(product?.ratings) ? product.ratings : [];
	const safeComments = Array.isArray(product?.comments) ? product.comments : [];

	useEffect(() => {
		if (safeRatings.length > 0 && user?._id) {
			const existingRatingObject = safeRatings.find(
				(ele) => ele?.ratedBy?._id === user._id
			);
			setStar(existingRatingObject ? existingRatingObject.star : 0);
		}
		setComments(safeComments);
	}, [safeComments, safeRatings, user]);

	const handleStarClick = async (newRating) => {
		if (!isAuthenticated() || !user?._id || !token) {
			toast.error("Please sign in to rate this product");
			return;
		}
		setStar(newRating);
		const { productStar } = await import("../../apiCore");
		productStar(product._id, newRating, token, user.email, user._id).then(
			(data) => {
				if (data.error) {
					toast.error(data.error);
				} else {
					toast.success("Rating updated!");
				}
			}
		);
	};

	const handleAddComment = async (e) => {
		e.preventDefault();
		if (!isAuthenticated()) {
			toast.error("Please sign in to leave a comment");
			return;
		}

		const { comment } = await import("../../apiCore");
		comment(user._id, token, product._id, { text }).then((data) => {
			if (data.error) {
				toast.error(data.error);
			} else {
				setText("");
				setComments(data.comments);
				toast.success("Comment added!");
				setTimeout(function () {
					window.location.reload(false);
				}, 2000);
			}
		});
	};

	const handleDeleteComment = async (comment) => {
		if (window.confirm("Are you sure you want to delete this comment?")) {
			const { uncomment } = await import("../../apiCore");
			uncomment(user._id, token, product._id, comment).then((data) => {
				if (data.error) {
					toast.error(data.error);
				} else {
					setComments(data.comments);
					toast.info("Comment deleted!");
					setTimeout(function () {
						window.location.reload(false);
					}, 2000);
				}
			});
		}
	};

	return (
		<CommentsAndRatingsWrapper>
			<CommentsTitle $withBottomSpacing>Rate this product</CommentsTitle>
			<RatingSection>
				<StarRating
					starDimension='25px'
					starSpacing='2px'
					starRatedColor='red'
					rating={star}
					changeRating={handleStarClick}
					numberOfStars={5}
					name={product._id}
				/>
			</RatingSection>
			<CommentsSection>
				<CommentsTitle>Comments</CommentsTitle>
				{isLeanBootstrap ? (
					<CommentLoadingText>
						Customer reviews are loading for the full product view.
					</CommentLoadingText>
				) : (
					comments.map((comment, index) => {
						const userRating = safeRatings.find(
							(rating) => rating?.ratedBy?._id === comment?.postedBy?._id
						)?.star;
						const postedByName = `${comment?.postedBy?.name || "Anonymous"}`
							.trim()
							.split(" ")
							.filter(Boolean);
						const displayName = postedByName[0] || "Anonymous";
						const displayInitial = postedByName[1]?.[0] || "";
						return (
							<CommentWrapper key={index}>
								<CommentDetails>
									<CommentText>{comment.text}</CommentText>
									<CommentMeta>
										Posted by {displayName}
										{displayInitial ? ` ${displayInitial}.` : ""} on{" "}
										{formatCommentDate(comment.created)}
									</CommentMeta>
									{userRating && (
										<UserRating>
											<StarRating
												starDimension='15px'
												starSpacing='2px'
												starRatedColor='red'
												rating={userRating}
												editing={false}
											/>
										</UserRating>
									)}
								</CommentDetails>
								{comment?.postedBy?._id && user?._id === comment.postedBy._id && (
									<DeleteIcon onClick={() => handleDeleteComment(comment)}>
										<DeleteOutlined />
									</DeleteIcon>
								)}
							</CommentWrapper>
						);
					})
				)}
				<AddCommentForm onSubmit={handleAddComment}>
					<CommentInput
						type='text'
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder='Add a comment'
					/>
					<SubmitButton type='submit'>Submit</SubmitButton>
				</AddCommentForm>
			</CommentsSection>
		</CommentsAndRatingsWrapper>
	);
};

export default CommentsAndRatings;

// Styled components...

const CommentsAndRatingsWrapper = styled.div`
	margin-top: 20px;
	margin-bottom: 3rem;
	max-width: 1140px;
	padding: 20px;
	background: var(--background-light);
	border-radius: 10px;
	box-shadow: var(--box-shadow-light);
	margin-left: auto;
	margin-right: auto;
	h3 {
		font-weight: bold;
		font-size: 1.3rem;
	}
`;

const RatingSection = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 20px;
`;

const CommentsSection = styled.div`
	margin-top: 20px;
`;

const CommentsTitle = styled.h3`
	font-size: 20px;
	color: var(--text-color-primary);
	margin-bottom: ${(props) => (props.$withBottomSpacing ? "1rem" : "0")};
`;

const CommentLoadingText = styled.p`
	color: var(--text-color-primary);
	margin-bottom: 16px;
`;

const CommentWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 10px;
	background: var(--background-secondary);
	border-radius: 5px;
	margin-bottom: 10px;
`;

const CommentDetails = styled.div`
	flex: 1;
`;

const CommentText = styled.p`
	font-size: 16px;
	color: var(--text-color-dark);
	margin-bottom: 5px;
`;

const CommentMeta = styled.div`
	font-size: 12px;
	color: var(--text-color-primary);
`;

const UserRating = styled.div`
	margin-top: 5px;
`;

const DeleteIcon = styled.div`
	cursor: pointer;
	color: var(--secondary-color-dark);
	margin-left: 10px;

	&:hover {
		color: var(--secondary-color);
	}
`;

const AddCommentForm = styled.form`
	display: flex;
	margin-top: 20px;
`;

const CommentInput = styled.input`
	flex: 1;
	padding: 10px;
	border-radius: 5px;
	border: 1px solid var(--border-color);
	margin-right: 10px;
`;

const SubmitButton = styled.button`
	padding: 10px 20px;
	background: var(--primary-color);
	color: var(--button-font-color);
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	transition: var(--main-transition);

	&:hover {
		background: var(--primary-color-dark);
		transition: var(--main-transition);
	}
`;
