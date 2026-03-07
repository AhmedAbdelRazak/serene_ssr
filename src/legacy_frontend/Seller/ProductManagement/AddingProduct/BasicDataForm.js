/** @format */

import React from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const toolbarOptions = [
	[{ header: [1, 2, 3, 4, 5, 6, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
	["link", "image", "video"],
	["clean"],
];

const BasicDataForm = ({
	setProductName,
	productName,
	setProductName_Arabic,
	productName_Arabic,
	description,
	setDescription,
	setDescription_Arabic,
	description_Arabic,
	setSlug,
	setSlug_Arabic,
	productSKU,
	setProductSKU,
	setAddVariables,
	addVariables,
	setClickedLink,
	chosenSeason,
	setChosenSeason,
	parentPrice1,
	setParentPrice1,
	parentPrice2,
	setParentPrice2,
	parentPrice3,
	setParentPrice3,
	parentPrice4,
	setParentPrice4,
	parentPrice5,
	setParentPrice5,
	inheritPrice,
	setInheritPrice,
	inheritParentSKU,
	setInheritParentSKU,
	mainColor,
	setMainColor,
	mainSize,
	setMainSize,
	allColors,
	allSizes,
	geodata,
	setGeodata,
}) => {
	const handleChange1 = (e) => {
		setProductName(e.target.value);
		setSlug(e.target.value.split(" ").join("-"));
		setProductName_Arabic(e.target.value);
		setSlug_Arabic(e.target.value.split(" ").join("-"));
	};

	const handleChange6 = (e) => {
		setProductSKU(e.target.value);
	};

	const handleChange7 = (e) => {
		setChosenSeason(e.target.value);
	};

	const handleChange8 = (e) => {
		setParentPrice1(e.target.value);
	};
	const handleChange9 = (e) => {
		setParentPrice2(e.target.value);
	};
	const handleChange10 = (e) => {
		setParentPrice3(e.target.value);
	};

	const handleChange11 = (e) => {
		setParentPrice4(e.target.value);
	};

	const handleChange12 = (e) => {
		setParentPrice5(e.target.value);
	};

	const handleChange13 = (e) => {
		setMainColor(e.target.value);
	};

	const handleChange14 = (e) => {
		setMainSize(e.target.value);
	};

	const handleGeodataChange = (e) => {
		const { name, value } = e.target;
		setGeodata((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	function handlePaste(e) {
		const clipboardData = e.clipboardData || window.clipboardData;
		if (clipboardData && clipboardData.getData) {
			const content = clipboardData.getData("text/html");
			const div = document.createElement("div");
			div.innerHTML = content;
			document.execCommand("insertHTML", false, div.innerHTML);
			e.preventDefault();
		}
	}

	function handleEditorChange(content, delta, source, editor) {
		const html = editor.getHTML();
		setDescription(html);
		setDescription_Arabic(html);
	}

	return (
		<form className='formwrapper'>
			<div className='row'>
				<div className='col-md-6 mx-auto'>
					<div className='form-group'>
						<label
							className='text-muted'
							style={{ fontWeight: "bold", fontSize: "13px" }}
						>
							Product Name
						</label>
						<input
							type='text'
							className='form-control'
							onChange={handleChange1}
							value={productName}
							required
						/>
					</div>
				</div>

				<div className='col-md-6 mx-auto'>
					<div className='form-group'>
						<label
							className='text-muted'
							style={{ fontWeight: "bold", fontSize: "13px" }}
						>
							Product {addVariables ? "Parent" : null} SKU
						</label>
						<input
							type='text'
							className='form-control'
							onChange={handleChange6}
							value={productSKU}
							required
						/>
					</div>
				</div>

				{addVariables ? null : (
					<>
						<div className='col-md-6 mx-auto'>
							<div className='form-group'>
								<select
									onChange={handleChange13}
									placeholder='Select a Ticket'
									className=' mb-3 col-md-12 mx-auto my-1'
									style={{
										paddingTop: "10px",
										paddingBottom: "10px",
										// paddingRight: "50px",
										// textAlign: "center",
										border: "#cfcfcf solid 1px",
										borderRadius: "10px",
										fontSize: "0.9rem",
										// boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
										textTransform: "capitalize",
									}}
								>
									{mainColor ? (
										<option value={mainColor} style={{ color: "darkgrey" }}>
											{mainColor}
										</option>
									) : (
										<option value=''>Select A Color</option>
									)}
									{allColors &&
										allColors.map((c, i) => {
											return (
												<option key={i} value={c.color}>
													{c.color}
												</option>
											);
										})}
								</select>
							</div>
						</div>

						<div className='col-md-6 mx-auto'>
							<div className='form-group'>
								<select
									onChange={handleChange14}
									placeholder='Select a Ticket'
									className=' mb-3 col-md-12 mx-auto my-1'
									style={{
										paddingTop: "10px",
										paddingBottom: "10px",
										// paddingRight: "50px",
										// textAlign: "center",
										border: "#cfcfcf solid 1px",
										borderRadius: "10px",
										fontSize: "0.9rem",
										// boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
										textTransform: "capitalize",
									}}
								>
									{mainSize ? (
										<option value={mainSize} style={{ color: "darkgrey" }}>
											{mainSize}
										</option>
									) : (
										<option value=''>Select A Size</option>
									)}
									{allSizes &&
										allSizes.map((s, i) => {
											return (
												<option key={i} value={s.size}>
													{s.size}
												</option>
											);
										})}
								</select>
							</div>
						</div>

						<div className='col-md-3 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Length
								</label>
								<input
									type='text'
									className='form-control'
									name='length'
									onChange={handleGeodataChange}
									value={geodata.length}
									required
								/>
							</div>
						</div>
						<div className='col-md-3 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Width
								</label>
								<input
									type='text'
									className='form-control'
									name='width'
									onChange={handleGeodataChange}
									value={geodata.width}
									required
								/>
							</div>
						</div>
						<div className='col-md-3 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Height
								</label>
								<input
									type='text'
									className='form-control'
									name='height'
									onChange={handleGeodataChange}
									value={geodata.height}
									required
								/>
							</div>
						</div>
						<div className='col-md-3 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Weight
								</label>
								<input
									type='text'
									className='form-control'
									name='weight'
									onChange={handleGeodataChange}
									value={geodata.weight}
									required
								/>
							</div>
						</div>
					</>
				)}

				{!addVariables ? null : (
					<React.Fragment>
						<div className='col-md-2 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Purchase Price
								</label>
								<input
									type='text'
									className='form-control'
									onChange={handleChange8}
									value={parentPrice1}
									required
								/>
							</div>
						</div>

						<div className='col-md-2 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Retailer Price
								</label>
								<input
									type='text'
									className='form-control'
									onChange={handleChange9}
									value={parentPrice2}
									required
								/>
							</div>
						</div>

						<div className='col-md-2 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									WholeSale Price
								</label>

								<input
									type='text'
									className='form-control'
									onChange={handleChange11}
									value={parentPrice4}
									required
								/>
							</div>
						</div>

						<div className='col-md-2 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Drop Shipping Price
								</label>

								<input
									type='text'
									className='form-control'
									onChange={handleChange12}
									value={parentPrice5}
									required
								/>
							</div>
						</div>

						<div className='col-md-2 mx-auto'>
							<div className='form-group'>
								<label
									className='text-muted'
									style={{ fontWeight: "bold", fontSize: "13px" }}
								>
									Price After Discount
								</label>

								<input
									type='text'
									className='form-control'
									onChange={handleChange10}
									value={parentPrice3}
									required
								/>
							</div>
						</div>

						<div className='col-md-3 mx-auto my-4'>
							<div className='form-group'>
								<label
									className='text-muted mx-2'
									style={{ fontWeight: "bold", fontSize: "15px" }}
								>
									Inherit All Prices
								</label>

								<input
									type='checkbox'
									// className='form-control'
									onChange={(e) => setInheritPrice(!inheritPrice)}
									checked={inheritPrice}
									value={inheritPrice}
									required
								/>
							</div>
						</div>
						<div className='col-md-3 mx-auto my-4'>
							<label
								className='text-muted'
								style={{ fontWeight: "bold", fontSize: "13px" }}
							>
								Inherit From Parent SKU
							</label>
							<input
								type='checkbox'
								className='ml-2 mt-2'
								onChange={() => {
									setInheritParentSKU(!inheritParentSKU);
								}}
								checked={inheritParentSKU === true ? true : false}
							/>
						</div>

						<div className='row'>
							<div className='col-md-3 mx-auto'>
								<div className='form-group'>
									<label
										className='text-muted'
										style={{ fontWeight: "bold", fontSize: "13px" }}
									>
										Length
									</label>
									<input
										type='text'
										className='form-control'
										name='length'
										onChange={handleGeodataChange}
										value={geodata.length}
										required
									/>
								</div>
							</div>
							<div className='col-md-3 mx-auto'>
								<div className='form-group'>
									<label
										className='text-muted'
										style={{ fontWeight: "bold", fontSize: "13px" }}
									>
										Width
									</label>
									<input
										type='text'
										className='form-control'
										name='width'
										onChange={handleGeodataChange}
										value={geodata.width}
										required
									/>
								</div>
							</div>
							<div className='col-md-3 mx-auto'>
								<div className='form-group'>
									<label
										className='text-muted'
										style={{ fontWeight: "bold", fontSize: "13px" }}
									>
										Height
									</label>
									<input
										type='text'
										className='form-control'
										name='height'
										onChange={handleGeodataChange}
										value={geodata.height}
										required
									/>
								</div>
							</div>
							<div className='col-md-3 mx-auto'>
								<div className='form-group'>
									<label
										className='text-muted'
										style={{ fontWeight: "bold", fontSize: "13px" }}
									>
										Weight
									</label>
									<input
										type='text'
										className='form-control'
										name='weight'
										onChange={handleGeodataChange}
										value={geodata.weight}
										required
									/>
								</div>
							</div>
						</div>
					</React.Fragment>
				)}
			</div>
			<div className='row mt-3'>
				<div className='col-md-11 mx-auto mb-5'>
					<div className='form-group'>
						<label
							className='text-muted'
							style={{ fontWeight: "bold", fontSize: "13px" }}
						>
							Add a Description (Product size, material, catchy phrases, etc...)
						</label>
						<>
							<ReactQuill
								value={description}
								onChange={handleEditorChange}
								modules={{
									toolbar: { container: toolbarOptions },
									clipboard: { matchVisual: false },
								}}
								onPaste={handlePaste}
								style={{ height: "200px" }} // Adjust the height value as needed
							/>
						</>
					</div>
				</div>

				{/* <div className='col-md-6 mx-auto'>
					<div className='form-group'>
						<label
							className='text-muted'
							style={{ fontWeight: "bold", fontSize: "13px" }}
						>
							Add Description (Arabic)
						</label>
						<textarea
							rows='11'
							onChange={(e) => setDescription_Arabic(e.target.value)}
							className='form-control'
							value={description_Arabic}
							placeholder='Required*  write a little bit about the product in Arabic'
							required
						/>
					</div>
				</div> */}
			</div>

			<div>
				<select
					onChange={handleChange7}
					placeholder='Select a Ticket'
					className=' mb-3 col-md-10 mx-auto my-1'
					style={{
						paddingTop: "12px",
						paddingBottom: "12px",
						// paddingRight: "50px",
						// textAlign: "center",
						border: "#cfcfcf solid 1px",
						borderRadius: "10px",
						fontSize: "0.9rem",
						// boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
						textTransform: "capitalize",
					}}
				>
					{chosenSeason ? (
						<option value={chosenSeason} style={{ color: "darkgrey" }}>
							{chosenSeason}
						</option>
					) : (
						<option value='Season'>Select A Season</option>
					)}
					<option key='1' value='Summer'>
						Summer
					</option>
					<option key='2' value='Fall'>
						Fall
					</option>
					<option key='3' value='Winter'>
						Winter
					</option>
					<option key='4' value='Spring'>
						Spring
					</option>
					<option key='5' value='All'>
						All Seasons
					</option>
				</select>
			</div>

			<div className='form-group'>
				<label
					className='text-muted'
					style={{ fontWeight: "bold", fontSize: "13px" }}
				>
					Add Variables
				</label>
				<input
					type='checkbox'
					className='ml-2 mt-2'
					onChange={() => setAddVariables(!addVariables)}
					checked={addVariables === true ? true : false}
				/>
			</div>

			<button
				className='btn btn-outline-primary mb-3'
				onClick={() => {
					setClickedLink(addVariables ? "AddVariables" : "AddPrices");
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
			>
				Next: Add Product Attributes
			</button>
		</form>
	);
};

export default BasicDataForm;

