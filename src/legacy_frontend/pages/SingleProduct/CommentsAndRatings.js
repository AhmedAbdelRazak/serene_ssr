import React, { useState, useEffect } from "react";
import styled from "styled-components";
import StarRating from "react-star-ratings";
import { toast } from "react-toastify";
import { productStar, comment, uncomment } from "../../apiCore"; // Import API functions
import { isAuthenticated } from "../../auth";
import { DeleteOutlined } from "@ant-design/icons";
import moment from "moment";

const CommentsAndRatings = ({ product, user, token }) => {
	const [star, setStar] = useState(0);
	const [comments, setComments] = useState([]);
	const [text, setText] = useState("");
	const safeRatings = Array.isArray(product?.ratings) ? product.ratings : [];
	const safeComments = Array.isArray(product?.comments) ? product.comments : [];

	useEffect(() => {
		if (safeRatings.length > 0 && user?._id) {
			const existingRatingObject = safeRatings.find(
				(ele) => ele.ratedBy._id === user._id
			);
			setStar(existingRatingObject ? existingRatingObject.star : 0);
		}
		setComments(safeComments);
	}, [safeComments, safeRatings, user]);

	const handleStarClick = (newRating) => {
		if (!isAuthenticated() || !user?._id || !token) {
			toast.error("Please sign in to rate this product");
			return;
		}
		setStar(newRating);
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

	const handleAddComment = (e) => {
		e.preventDefault();
		if (!isAuthenticated()) {
			toast.error("Please sign in to leave a comment");
			return;
		}

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

	const handleDeleteComment = (comment) => {
		if (window.confirm("Are you sure you want to delete this comment?")) {
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
		<CommentsAndRatingsWrapper className='container py-3 mb-5'>
			<CommentsTitle className='mb-3'>Rate this product</CommentsTitle>
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
				{comments.map((comment, index) => {
					const userRating = safeRatings.find(
						(rating) => rating.ratedBy._id === comment?.postedBy?._id
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
									{moment(comment.created).format("MMMM Do YYYY, h:mm:ss a")}
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
				})}
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
	padding: 20px;
	background: var(--background-light);
	border-radius: 10px;
	box-shadow: var(--box-shadow-light);
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
