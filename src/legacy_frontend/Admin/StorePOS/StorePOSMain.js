import React, { useState, useEffect, useCallback, useRef } from "react";
import styled, { keyframes } from "styled-components";
import {
  Select,
  InputNumber,
  Divider,
  Row,
  Col,
  Checkbox,
  Input,
  Radio,
  Button,
  Modal,
  Spin,
} from "antd";
import { createOrderPOS, getColors } from "../apiAdmin";
import { gettingFilteredProducts, getShippingOptions } from "../../apiCore";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import { ToastContainer, toast } from "react-toastify";
import { FaTrashAlt, FaEdit, FaCheckCircle } from "react-icons/fa";
import { isAuthenticated } from "../../auth";
import socket from "../../Chat/socket";
import StorePOSMobile from "./StorePOSMobile";

const { Option } = Select;
const DEFAULT_POS_FILTERS = {
  color: "",
  priceMin: 0,
  priceMax: 1000,
  category: "",
  size: "",
  gender: "",
  searchTerm: "",
};

const parsePosFiltersFromSearch = (search) => {
  const params = new URLSearchParams(search || "");
  return {
    color: params.get("color") || "",
    priceMin: Number(params.get("priceMin") || DEFAULT_POS_FILTERS.priceMin),
    priceMax: Number(params.get("priceMax") || DEFAULT_POS_FILTERS.priceMax),
    category: params.get("category") || "",
    size: params.get("size") || "",
    gender: params.get("gender") || "",
    searchTerm: params.get("searchTerm") || "",
  };
};

const normalizeFilterToken = (value) => `${value || ""}`.trim();

const doesProductMatchCategory = (product, categoryValue) => {
  const normalizedTarget = normalizeFilterToken(categoryValue);
  if (!normalizedTarget) return true;
  const normalizedTargetLower = normalizedTarget.toLowerCase();
  const category = product?.category;
  const candidates = [];

  if (typeof category === "string") {
    candidates.push(category);
  } else if (category && typeof category === "object") {
    candidates.push(
      category?._id,
      category?.id,
      category?.categorySlug,
      category?.categoryName,
      category?.name,
      category?.category,
    );
  }

  return candidates
    .map((entry) => normalizeFilterToken(entry))
    .filter(Boolean)
    .some(
      (entry) =>
        entry === normalizedTarget ||
        entry.toLowerCase() === normalizedTargetLower,
    );
};

const buildPosSearch = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined) return;
    if (key === "priceMin" && Number(value) === DEFAULT_POS_FILTERS.priceMin)
      return;
    if (key === "priceMax" && Number(value) === DEFAULT_POS_FILTERS.priceMax)
      return;
    params.set(key, `${value}`);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

const StorePOSMain = () => {
  const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const history = useHistory();
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allColors, setAllColors] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [filters, setFilters] = useState(() =>
    parsePosFiltersFromSearch(
      typeof window !== "undefined" ? window.location.search : "",
    ),
  );
  const [sendReceipt, setSendReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [shippingCharge, setShippingCharge] = useState("no");
  const [allShippingOptions, setAllShippingOptions] = useState([]);
  const [shipmentChosen, setShipmentChosen] = useState(null);
  const [customerName, setCustomerName] = useState("No Name");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("674 Rocky Loop");
  const [customerCity, setCustomerCity] = useState("Crestline");
  const [customerState, setCustomerState] = useState("California");
  const [customerZipcode, setCustomerZipcode] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const page = 1;
  const records = 200;
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );

  const [editableTotalAmount, setEditableTotalAmount] = useState(null); // New state for editable total amount
  const [isEditingTotalAmount, setIsEditingTotalAmount] = useState(false); // New state for editing mode
  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { user, token } = isAuthenticated();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 1000) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const parsedFilters = parsePosFiltersFromSearch(location.search);
    setFilters((prevFilters) => {
      const currentValue = JSON.stringify(prevFilters);
      const parsedValue = JSON.stringify(parsedFilters);
      return currentValue === parsedValue ? prevFilters : parsedFilters;
    });
  }, [location.search]);

  const fetchFilteredProducts = useCallback(() => {
    const fetchId = ++latestFetchIdRef.current;
    const query = new URLSearchParams(filters).toString();
    gettingFilteredProducts(query, page, records).then((data) => {
      if (fetchId !== latestFetchIdRef.current) return;
      if (data.error) {
        console.log(data.error);
      } else {
        const uniqueProductMap = {};

        const processedProducts = data.products
          .map((product) => {
            if (
              product.productAttributes &&
              product.productAttributes.length > 0
            ) {
              const uniqueAttributes = product.productAttributes.reduce(
                (acc, attr) => {
                  if (attr.productImages.length > 0 && !acc[attr.color]) {
                    acc[attr.color] = {
                      ...product,
                      productAttributes: [attr],
                      thumbnailImage: product.thumbnailImage,
                    };
                  }
                  return acc;
                },
                {},
              );

              Object.values(uniqueAttributes).forEach((attrProduct) => {
                uniqueProductMap[
                  `${product._id}-${attrProduct.productAttributes[0].color}`
                ] = attrProduct;
              });

              return Object.values(uniqueAttributes);
            }
            uniqueProductMap[product._id] = product;
            return [product];
          })
          .flat();

        const params = new URLSearchParams(location.search);
        const categoryParam = normalizeFilterToken(
          filters.category || params.get("category"),
        );
        const uniqueProducts = categoryParam
          ? Object.values(processedProducts).filter((product) =>
              doesProductMatchCategory(product, categoryParam),
            )
          : Object.values(processedProducts);

        setProducts(uniqueProducts);
        setCategories(data.categories || []);
        setColors(data.colors || []);
        setSizes(data.sizes || []);
      }
    });
  }, [filters, location.search]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [fetchFilteredProducts]);

  useEffect(() => {
    fetchColorsAndSizes();
    fetchShippingOptions();
  }, []);

  const fetchColorsAndSizes = async () => {
    const colors = await getColors();
    setAllColors(colors);
  };

  const fetchShippingOptions = async () => {
    const shippingOptions = await getShippingOptions();
    setAllShippingOptions(shippingOptions);
  };

  const addProductToOrder = (product) => {
    const defaultAttributes = product.productAttributes?.[0] || {};
    const defaultColor = defaultAttributes.color || "";
    const defaultSize = defaultAttributes.size || "";

    setSelectedProducts((prev) => {
      if (product.productAttributes && product.productAttributes.length > 0) {
        const existingProduct = prev.find(
          (p) =>
            p._id === product._id &&
            p.chosenAttributes?.color === defaultColor &&
            p.chosenAttributes?.size === defaultSize,
        );

        if (existingProduct) {
          return prev.map((p) =>
            p._id === product._id &&
            p.chosenAttributes?.color === defaultColor &&
            p.chosenAttributes?.size === defaultSize
              ? { ...p, quantity: p.quantity + 1 }
              : p,
          );
        } else {
          return [
            ...prev,
            {
              ...product,
              quantity: 1,
              chosenAttributes: defaultAttributes,
              priceAfterDiscount: defaultAttributes.priceAfterDiscount,
              imageUrl:
                defaultAttributes.productImages?.[0]?.url ||
                product.thumbnailImage?.[0]?.images?.[0]?.url ||
                "",
            },
          ];
        }
      } else {
        const existingProduct = prev.find((p) => p._id === product._id);

        if (existingProduct) {
          return prev.map((p) =>
            p._id === product._id ? { ...p, quantity: p.quantity + 1 } : p,
          );
        } else {
          return [
            ...prev,
            {
              ...product,
              quantity: 1,
              priceAfterDiscount: product.priceAfterDiscount,
              imageUrl: product.thumbnailImage?.[0]?.images?.[0]?.url || "",
            },
          ];
        }
      }
    });
  };

  const handleQuantityChange = (productId, value, chosenAttributes = null) => {
    setSelectedProducts((prev) =>
      prev.map((product) => {
        if (product._id === productId) {
          if (chosenAttributes) {
            if (
              product.chosenAttributes &&
              product.chosenAttributes.color === chosenAttributes.color &&
              product.chosenAttributes.size === chosenAttributes.size
            ) {
              return { ...product, quantity: value };
            }
          } else {
            return { ...product, quantity: value };
          }
        }
        return product;
      }),
    );
  };

  const handleColorChange = (productId, newColor, productIndex) => {
    setSelectedProducts((prev) => {
      return prev.map((product, index) => {
        if (product._id === productId && index === productIndex) {
          if (!product.overallProductAttributes) {
            console.error("No productAttributes found for product:", product);
            return product;
          }

          const chosenAttribute = product.overallProductAttributes.find(
            (attr) =>
              attr.color === newColor &&
              (!product.chosenAttributes ||
                attr.size === product.chosenAttributes.size),
          );

          if (chosenAttribute) {
            const updatedProduct = {
              ...product,
              chosenAttributes: {
                ...product.chosenAttributes,
                color: newColor,
              },
              priceAfterDiscount: chosenAttribute.priceAfterDiscount,
              imageUrl:
                chosenAttribute.productImages?.[0]?.url || product.imageUrl,
            };

            return updatedProduct;
          } else {
            console.error("No matching attribute found for color:", newColor);
          }
        }
        return product;
      });
    });
  };

  const handleSizeChange = (productId, newSize, productIndex) => {
    setSelectedProducts((prev) => {
      return prev.map((product, index) => {
        if (product._id === productId && index === productIndex) {
          if (!product.overallProductAttributes) {
            console.error("No productAttributes found for product:", product);
            return product;
          }

          const chosenAttribute = product.overallProductAttributes.find(
            (attr) =>
              attr.size === newSize &&
              (!product.chosenAttributes ||
                attr.color === product.chosenAttributes.color),
          );

          if (chosenAttribute) {
            const updatedProduct = {
              ...product,
              chosenAttributes: { ...product.chosenAttributes, size: newSize },
              priceAfterDiscount: chosenAttribute.priceAfterDiscount,
              imageUrl:
                chosenAttribute.productImages?.[0]?.url || product.imageUrl,
            };

            return updatedProduct;
          } else {
            console.error("No matching attribute found for size:", newSize);
          }
        }
        return product;
      });
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prevFilters) => {
      const normalizedValue =
        value === undefined || value === null ? "" : `${value}`;
      const nextFilters = {
        ...prevFilters,
        [key]: normalizedValue,
      };
      const nextSearch = buildPosSearch(nextFilters);
      history.replace({
        pathname: location.pathname,
        search: nextSearch,
      });
      return nextFilters;
    });
  };

  const removeProductFromOrder = (productId, color, size) => {
    if (color) {
      setSelectedProducts((prev) =>
        prev.filter(
          (product) =>
            !(
              product._id === productId &&
              product.chosenAttributes?.color === color &&
              product.chosenAttributes?.size === size
            ),
        ),
      );
    } else {
      setSelectedProducts((prev) =>
        prev.filter((product) => !(product._id === productId)),
      );
    }
  };

  const handleShippingOptionChange = (e) => {
    const chosenOption = allShippingOptions.find(
      (option) => option._id === e.target.value,
    );
    setShipmentChosen(chosenOption);
  };

  // Adjust total amount calculation to reflect chosen attributes
  const totalAmount =
    selectedProducts.reduce((total, product) => {
      const price = product.priceAfterDiscount || product.price;
      return total + product.quantity * price;
    }, 0) + (shipmentChosen ? shipmentChosen.shippingPrice : 0);

  const prepareOrderData = (
    selectedProducts,
    shipmentChosen,
    customerDetails,
    sendReceipt,
    sendPaymentLink,
  ) => {
    // Ensure you have the product list in scope, adjust as necessary if products are fetched differently
    const productList = products;

    const productsNoVariable = selectedProducts
      .filter((item) => !item.chosenAttributes)
      .map((item) => {
        const product = productList.find((prod) => prod._id === item._id);
        const imageUrl = product?.thumbnailImage?.[0]?.images?.[0]?.url || ""; // Adjust path as necessary
        return {
          productId: item._id,
          name: product?.productName || "Product Name",
          ordered_quantity: item.quantity,
          price: item.priceAfterDiscount || item.price,
          image: imageUrl,
        };
      });

    const chosenProductQtyWithVariables = selectedProducts
      .filter((item) => item.chosenAttributes)
      .map((item) => {
        const product = productList.find((prod) => prod._id === item._id);
        const chosenAttributes = item.chosenAttributes;
        const imageUrl =
          chosenAttributes.productImages?.[0]?.url ||
          product.thumbnailImage?.[0]?.images?.[0]?.url ||
          "";
        return {
          productId: item._id,
          name: product?.productName || "Product Name",
          ordered_quantity: item.quantity,
          price:
            chosenAttributes.priceAfterDiscount ||
            item.priceAfterDiscount ||
            item.price,
          image: imageUrl,
          chosenAttributes: {
            color: chosenAttributes.color,
            size: chosenAttributes.size,
            SubSKU: chosenAttributes.SubSKU,
          },
        };
      });

    return {
      productsNoVariable,
      chosenProductQtyWithVariables,
      customerDetails: {
        name: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phone,
        address: customerDetails.address,
        city: customerDetails.city,
        state: customerDetails.state,
        zipcode: customerDetails.zipcode,
      },
      totalOrderQty: selectedProducts.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      totalAmount:
        selectedProducts.reduce(
          (total, item) =>
            total + item.quantity * (item.priceAfterDiscount || item.price),
          0,
        ) + (shipmentChosen ? shipmentChosen.shippingPrice : 0),
      totalAmountAfterDiscount:
        editableTotalAmount !== null
          ? editableTotalAmount
          : selectedProducts.reduce(
              (total, item) =>
                total + item.quantity * (item.priceAfterDiscount || item.price),
              0,
            ) + (shipmentChosen ? shipmentChosen.shippingPrice : 0),
      chosenShippingOption: shipmentChosen
        ? shipmentChosen
        : {
            carrierName: "No Carrier",
            shippingPrice: 0,
          },
      orderSource: "POS",
      sendReceipt,
      sendPaymentLink,
      paymentStatus:
        paymentMethod === "Generate Payment Link"
          ? "Generate Payment Link"
          : paymentMethod,
      status: shipmentChosen ? "In Process" : "Delivered",
      // other fields like appliedCoupon, orderComment, etc., can be added here
    };
  };

  const handleCreateOrder = async () => {
    const orderData = prepareOrderData(
      selectedProducts,
      shipmentChosen,
      {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        city: customerCity,
        state: customerState,
        zipcode: customerZipcode,
      },
      sendReceipt,
      paymentMethod,
    );

    try {
      const response = await createOrderPOS(
        token,
        orderData,
        "paymentToken",
        user._id,
      );
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Order successfully created.");
        clearCart();
        // Redirect or perform other actions after successful order creation
      }
    } catch (error) {
      toast.error("Error creating order.");
      console.error("Error creating order:", error);
    }
  };

  const handleGeneratePaymentLink = async () => {
    setLoading(true);
    const orderData = prepareOrderData(
      selectedProducts,
      shipmentChosen,
      {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        city: customerCity,
        state: customerState,
        zipcode: customerZipcode,
      },
      sendReceipt,
      true, // sendPaymentLink
    );

    try {
      const response = await createOrderPOS(
        token,
        orderData,
        "paymentToken",
        user._id,
      );
      if (response.error) {
        toast.error(response.error);
        setLoading(false);
      } else {
        toast.success("Payment link generated and sent.");
        // Listen for payment status updates via WebSocket
        socket.on("orderUpdated", (updatedOrder) => {
          if (
            updatedOrder._id === response._id &&
            updatedOrder.paymentStatus === "Paid Via Link"
          ) {
            setLoading(false);
            setPaymentStatus("Paid Via Link");
            setTimeout(() => {
              clearCart();
            }, 3000);
          }
        });
      }
    } catch (error) {
      toast.error("Error creating order.");
      console.error("Error creating order:", error);
      setLoading(false);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleEditTotalAmount = () => {
    setIsEditingTotalAmount(true);
    setEditableTotalAmount(totalAmount);
  };

  const handleSaveTotalAmount = () => {
    setIsEditingTotalAmount(false);
    setIsModalVisible(false);
  };

  useEffect(() => {
    // Listen for payment status updates via WebSocket
    socket.on("orderUpdated", (updatedOrder) => {
      if (updatedOrder.paymentStatus === "Paid Via Link") {
        setLoading(false);
        setPaymentStatus("Paid Via Link");
        setTimeout(() => {
          clearCart();
        }, 3000);
      }
    });

    // Cleanup on component unmount
    return () => {
      socket.off("orderUpdated");
    };
  }, []);

  const getColorName = (hexa) => {
    const colorObject =
      allColors && allColors.find((color) => color.hexa === hexa);
    return colorObject ? colorObject.color : "Unknown Color";
  };

  return (
    <StorePOSMainWrapper $collapsed={collapsed}>
      <ToastContainer className="toast-top-center" position="top-center" />

      <div className="grid-container-main">
        <div className="navcontent">
          <AdminNavbar
            fromPage="StorePOS"
            AdminMenuStatus={AdminMenuStatus}
            setAdminMenuStatus={setAdminMenuStatus}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        </div>
        <div className="otherContentWrapper">
          <div className="container-wrapper">
            <TitleWrapper>Serene Jannat (POS)</TitleWrapper>
            <>
              {isMobile ? (
                <StorePOSMobile />
              ) : (
                <>
                  <FilterWrapper>
                    <Row gutter={[16, 16]}>
                      <Col span={4}>
                        <Select
                          placeholder="Color"
                          style={{ width: "100%" }}
                          value={filters.color || undefined}
                          onChange={(value) =>
                            handleFilterChange("color", value)
                          }
                          allowClear
                        >
                          {colors.map((color, index) => (
                            <Option key={index} value={color}>
                              {allColors.find((clr) => clr.hexa === color)
                                ?.color || color}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={4}>
                        <Select
                          placeholder="Size"
                          style={{ width: "100%" }}
                          value={filters.size || undefined}
                          onChange={(value) =>
                            handleFilterChange("size", value)
                          }
                          allowClear
                        >
                          {sizes.map((size, index) => (
                            <Option key={index} value={size}>
                              {size}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={4}>
                        <Select
                          placeholder="Category"
                          style={{ width: "100%" }}
                          value={filters.category || undefined}
                          onChange={(value) =>
                            handleFilterChange("category", value)
                          }
                          allowClear
                        >
                          {categories &&
                            categories.map((category, index) => (
                              <Option
                                key={index}
                                value={
                                  category._id ||
                                  category.id ||
                                  category.categorySlug
                                }
                              >
                                {category.name ||
                                  category.categoryName ||
                                  category.category ||
                                  category.categorySlug}
                              </Option>
                            ))}
                        </Select>
                      </Col>
                      <Col span={8}>
                        <Input
                          placeholder="Search by product name..."
                          value={filters.searchTerm || ""}
                          onChange={(e) =>
                            handleFilterChange("searchTerm", e.target.value)
                          }
                          allowClear
                        />
                      </Col>
                    </Row>
                  </FilterWrapper>
                  <ContentGrid>
                    <ProductsSection>
                      {products &&
                        products.map((product) => {
                          const totalQuantity =
                            product.productAttributes?.reduce(
                              (acc, attr) => acc + attr.quantity,
                              0,
                            ) || product.quantity;

                          const productImages =
                            product.productAttributes &&
                            product.productAttributes.length > 0
                              ? product.productAttributes[0].productImages
                              : product.thumbnailImage[0].images;
                          const imageUrl =
                            productImages && productImages.length > 0
                              ? productImages[0].url
                              : "";

                          const chosenProductAttributes =
                            product.productAttributes &&
                            product.productAttributes.length > 0
                              ? product.productAttributes[0]
                              : null;

                          const originalPrice =
                            chosenProductAttributes &&
                            chosenProductAttributes.price
                              ? chosenProductAttributes.price
                              : product.price;
                          const discountedPrice =
                            product.priceAfterDiscount > 0
                              ? product.priceAfterDiscount
                              : chosenProductAttributes.priceAfterDiscount;

                          const colorName =
                            (chosenProductAttributes &&
                              getColorName(chosenProductAttributes.color)) ||
                            product.color ||
                            "";

                          const sizeName =
                            (chosenProductAttributes &&
                              chosenProductAttributes.size) ||
                            product.size ||
                            "";

                          return (
                            <ProductCard
                              key={product._id}
                              onClick={() => addProductToOrder(product)}
                            >
                              {totalQuantity > 0 ? null : (
                                <OutOfStockBadge>Out of Stock</OutOfStockBadge>
                              )}
                              <img src={imageUrl} alt={product.productName} />
                              <div>
                                <h3>{product.productName}</h3>
                                {discountedPrice < originalPrice ? (
                                  <>
                                    <OriginalPrice>
                                      ${originalPrice}
                                    </OriginalPrice>
                                    <DiscountedPrice>
                                      ${discountedPrice}
                                    </DiscountedPrice>
                                  </>
                                ) : (
                                  <p>${originalPrice}</p>
                                )}
                                {colorName && (
                                  <p
                                    style={{
                                      fontSize: "12px",
                                      color: "grey",
                                      fontWeight: "bold",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    Color: {colorName}
                                  </p>
                                )}
                                {sizeName && (
                                  <p
                                    style={{
                                      fontSize: "12px",
                                      color: "grey",
                                      fontWeight: "bold",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    Size: {sizeName}
                                  </p>
                                )}
                              </div>
                            </ProductCard>
                          );
                        })}
                    </ProductsSection>
                    <Divider type="vertical" />
                    <OrderSection>
                      {selectedProducts.length === 0 ? (
                        <NoProductsMessage>
                          No products added to the order
                        </NoProductsMessage>
                      ) : (
                        <>
                          <h2>Your Order</h2>
                          {selectedProducts &&
                            selectedProducts.map((product, index) => {
                              const productColors =
                                product.overallProductAttributes?.map(
                                  (attr) => attr.color,
                                ) || [];
                              const uniqueProductColors = [
                                ...new Set(productColors),
                              ];

                              const productSizes =
                                product.overallProductAttributes?.map(
                                  (attr) => attr.size,
                                ) || [];
                              const uniqueProductSizes = [
                                ...new Set(productSizes),
                              ];

                              const chosenAttributes =
                                product.chosenAttributes || {};

                              const chosenAttribute =
                                product.overallProductAttributes?.find(
                                  (attr) =>
                                    attr.color === chosenAttributes.color &&
                                    attr.size === chosenAttributes.size,
                                );

                              const price = chosenAttribute
                                ? chosenAttribute.priceAfterDiscount
                                : product.priceAfterDiscount || product.price;

                              const imageUrl =
                                chosenAttribute?.productImages?.[0]?.url ||
                                product.thumbnailImage?.[0]?.images?.[0]?.url ||
                                "";

                              return (
                                <OrderItem key={`${product._id}-${index}`}>
                                  <OrderItemImage
                                    src={imageUrl}
                                    alt={product.productName}
                                  />
                                  <h3>{product.productName}</h3>
                                  <p>Price: ${price}</p>
                                  <div>
                                    <span>Quantity: </span>
                                    <InputNumber
                                      min={1}
                                      value={product.quantity}
                                      onChange={(value) =>
                                        handleQuantityChange(
                                          product._id,
                                          value,
                                          product.chosenAttributes,
                                        )
                                      }
                                    />
                                  </div>
                                  {product.overallProductAttributes &&
                                    product.overallProductAttributes.length >
                                      0 && (
                                      <>
                                        <div>
                                          <span>Color: </span>
                                          <Select
                                            value={chosenAttributes.color}
                                            onChange={(value) =>
                                              handleColorChange(
                                                product._id,
                                                value,
                                                index,
                                              )
                                            }
                                          >
                                            {uniqueProductColors.map(
                                              (color) => (
                                                <Option
                                                  key={color}
                                                  value={color}
                                                >
                                                  {allColors.find(
                                                    (clr) => clr.hexa === color,
                                                  )?.color || color}
                                                </Option>
                                              ),
                                            )}
                                          </Select>
                                        </div>
                                        <div>
                                          <span>Size: </span>
                                          <Select
                                            value={chosenAttributes.size}
                                            onChange={(value) =>
                                              handleSizeChange(
                                                product._id,
                                                value,
                                                index,
                                              )
                                            }
                                          >
                                            {uniqueProductSizes.map((size) => (
                                              <Option key={size} value={size}>
                                                {size}
                                              </Option>
                                            ))}
                                          </Select>
                                        </div>
                                      </>
                                    )}
                                  <StyledGeoDataList>
                                    {product.geodata &&
                                      product.geodata.length && (
                                        <li>
                                          Length: {product.geodata.length} in
                                        </li>
                                      )}
                                    {product.geodata &&
                                      product.geodata.width && (
                                        <li>
                                          Width: {product.geodata.width} in
                                        </li>
                                      )}
                                    {product.geodata &&
                                      product.geodata.height && (
                                        <li>
                                          Height: {product.geodata.height} in
                                        </li>
                                      )}
                                    {product.geodata &&
                                      product.geodata.weight && (
                                        <li>
                                          Weight: {product.geodata.weight} lbs
                                        </li>
                                      )}
                                  </StyledGeoDataList>
                                  <RemoveButton
                                    onClick={() =>
                                      removeProductFromOrder(
                                        product._id,
                                        chosenAttributes.color,
                                        chosenAttributes.size,
                                      )
                                    }
                                  >
                                    <FaTrashAlt />
                                  </RemoveButton>
                                </OrderItem>
                              );
                            })}
                          <Divider />
                          <CustomerDetailsWrapper>
                            <h5
                              style={{ fontSize: "1rem", fontWeight: "bold" }}
                            >
                              Customer Details:{" "}
                              <FaEdit
                                style={{
                                  marginLeft: "10px",
                                  cursor: "pointer",
                                }}
                                onClick={showModal}
                              />
                            </h5>

                            <br />
                          </CustomerDetailsWrapper>
                          <Label>
                            Do you want to charge the client for shipping?
                          </Label>
                          <Radio.Group
                            onChange={(e) => setShippingCharge(e.target.value)}
                            value={shippingCharge}
                            style={{ marginBottom: "10px" }}
                          >
                            <Radio value={"yes"}>Yes</Radio>
                            <Radio value={"no"}>No</Radio>
                          </Radio.Group>
                          {shippingCharge === "yes" && (
                            <>
                              <Label>Choose a carrier:</Label>
                              {allShippingOptions.map((option) => (
                                <ShippingOption key={option._id}>
                                  <ShippingLabel>
                                    <input
                                      type="radio"
                                      name="shippingOption"
                                      value={option._id}
                                      checked={
                                        shipmentChosen?._id === option._id
                                      }
                                      onChange={handleShippingOptionChange}
                                    />
                                    {option.carrierName} - $
                                    {option.shippingPrice}
                                  </ShippingLabel>
                                </ShippingOption>
                              ))}
                            </>
                          )}
                          <Divider />
                          <Label>Payment Method:</Label>
                          <Select
                            className="my-3"
                            placeholder="Select Payment Method"
                            style={{ width: "100%", marginBottom: "10px" }}
                            onChange={(value) => setPaymentMethod(value)}
                          >
                            <Option value="Cash">Cash</Option>
                            <Option value="Venmo">Venmo</Option>
                            <Option value="Generate Payment Link">
                              Generate Payment Link
                            </Option>
                            <Option value="Pay On Delivery">
                              Pay On Delivery
                            </Option>
                          </Select>

                          <Checkbox
                            checked={sendReceipt}
                            onChange={(e) => setSendReceipt(e.target.checked)}
                          >
                            Do you want to send a receipt?
                          </Checkbox>
                          {sendReceipt && (
                            <Input
                              type="email"
                              placeholder="Enter email"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              style={{ marginTop: "10px" }}
                            />
                          )}
                          <TotalAmount>
                            Total Amount: $
                            {editableTotalAmount ? (
                              <>
                                <s style={{ color: "red", fontSize: "1.2rem" }}>
                                  ${totalAmount.toFixed(2)}
                                </s>{" "}
                                $
                                {editableTotalAmount?.toFixed(2) ||
                                  totalAmount.toFixed(2)}
                              </>
                            ) : (
                              totalAmount.toFixed(2)
                            )}
                            <FaEdit
                              style={{
                                marginLeft: "10px",
                                cursor: "pointer",
                              }}
                              onClick={handleEditTotalAmount}
                            />
                          </TotalAmount>
                          {paymentMethod === "Generate Payment Link" && (
                            <Button
                              type="primary"
                              style={{ marginBottom: "10px" }}
                              onClick={handleGeneratePaymentLink}
                            >
                              Generate Payment Link
                            </Button>
                          )}

                          {paymentMethod !== "Generate Payment Link" && (
                            <Button type="primary" onClick={handleCreateOrder}>
                              Create Order
                            </Button>
                          )}
                        </>
                      )}
                    </OrderSection>
                  </ContentGrid>
                </>
              )}
            </>
          </div>
        </div>
      </div>
      <Modal
        title="Edit Customer Details"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <div className="row">
          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="email"
              placeholder="Enter email (required for payment link)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{ marginBottom: "10px" }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter city"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter state"
              value={customerState}
              onChange={(e) => setCustomerState(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>

          <div className="col-md-6">
            <Input
              type="text"
              placeholder="Enter zipcode"
              value={customerZipcode}
              onChange={(e) => setCustomerZipcode(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                width: "100%",
              }}
            />
          </div>
        </div>
      </Modal>
      <Modal
        title="Edit Total Amount"
        open={isEditingTotalAmount}
        onOk={handleSaveTotalAmount}
        onCancel={() => setIsEditingTotalAmount(false)}
      >
        <InputNumber
          value={editableTotalAmount}
          onChange={setEditableTotalAmount}
          style={{ width: "100%" }}
        />
        <p>
          The customer should pay: <s>${totalAmount.toFixed(2)}</s> $
          {editableTotalAmount?.toFixed(2) || totalAmount.toFixed(2)}
        </p>
      </Modal>
      {loading && (
        <Overlay>
          <Spin size="large" />
          <LoadingText>
            Pending Customer's Payment<span>...</span>
          </LoadingText>
        </Overlay>
      )}
      {paymentStatus === "Paid Via Link" && (
        <Overlay>
          <SuccessMessage>
            <FaCheckCircle size={80} color="green" />
            <h2>Payment Confirmed</h2>
          </SuccessMessage>
        </Overlay>
      )}
    </StorePOSMainWrapper>
  );
};

export default StorePOSMain;

const clearCart = () => {
  localStorage.removeItem("cart");
  window.location.reload();
};

const fadeInOut = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingText = styled.h2`
  color: white;
  margin-top: 20px;
  font-size: 24px;

  span {
    animation: ${fadeInOut} 1.5s infinite;
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  h2 {
    color: white;
    margin-top: 20px;
    font-size: 24px;
  }
`;

const StorePOSMainWrapper = styled.div`
  overflow-x: hidden;
  margin-top: 80px;
  min-height: 800px;
  padding-bottom: 100px;

  .grid-container-main {
    display: grid;
    grid-template-columns: ${(props) =>
      props.$collapsed ? "5% 95%" : "17% 83%"};
  }

  .container-wrapper {
    border: 2px solid lightgrey;
    padding: 20px;
    border-radius: 20px;
    background: white;
    margin: 0px 10px;
  }

  @media (max-width: 1400px) {
    background: white;
  }
`;

const TitleWrapper = styled.h1`
  font-size: 1.8rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
`;

const FilterWrapper = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const ContentGrid = styled.div`
  display: flex;
  height: 80vh; /* Adjust height as needed */
`;

const ProductsSection = styled.div`
  width: 60%;
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
`;

const ProductCard = styled.div`
  width: 200px;
  margin: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  text-align: center;
  cursor: pointer;
  position: relative;

  img {
    width: 80%;
    height: 150px; /* Adjust height as needed */
    object-fit: cover;
    object-position: center;
  }

  div {
    margin-top: 10px;
  }

  h3 {
    margin-bottom: 5px;
    font-size: 1rem;
    text-transform: capitalize;
  }

  p {
    margin: 0;
  }
`;

const OutOfStockBadge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: red;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-weight: bold;
  z-index: 10;
`;

const OriginalPrice = styled.span`
  color: grey;
  text-decoration: line-through;
  margin-right: 8px;
  font-weight: bold;
`;

const DiscountedPrice = styled.span`
  color: red;
  font-weight: bold;
`;

const OrderSection = styled.div`
  width: 40%;
  padding: 20px;
  border-left: 1px solid #ddd;
  overflow-y: auto;

  h2 {
    font-size: 1.5rem;
    font-weight: bolder;
    text-transform: capitalize;
    text-decoration: underline;
  }
`;

const OrderItem = styled.div`
  border-bottom: 1px solid #ddd;
  margin-bottom: 10px;
  padding-bottom: 10px;
  position: relative;

  h3 {
    margin: 0 0 5px 0;
    font-size: 1.1rem;
    font-weight: bolder;
    text-transform: capitalize;
  }

  p {
    margin: 5px 0;
  }

  div {
    margin: 5px 0;
  }
`;

const OrderItemImage = styled.img`
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 5px;
  margin-right: 10px;
`;

const NoProductsMessage = styled.div`
  font-size: 1.2rem;
  color: grey;
  text-align: center;
  margin-top: 20px;
`;

const StyledGeoDataList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 10px;
  color: var(--text-color-primary);
  font-weight: bold;
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;

  li {
    margin-right: 10px;
    color: var(--text-color-secondary);
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  right: 10px;
  top: 10px;
  background: none;
  border: none;
  color: var(--secondary-color);
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: var(--secondary-color-dark);
  }
`;

const TotalAmount = styled.div`
  margin-top: 30px;
  font-size: 1.5rem;
  font-weight: bold;
  padding-bottom: 20px;
`;

const CustomerDetailsWrapper = styled.div`
  align-items: center;
  margin-bottom: 10px;

  & > label {
    margin-right: 10px;
  }
`;

const Label = styled.label`
  font-size: 1rem;
  font-weight: bold;
  margin-right: 10px;
`;

const ShippingOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 10px;

  input {
    margin-right: 10px;
  }

  label {
    font-size: 1rem;
  }
`;

const ShippingLabel = styled.label`
  font-size: 1rem;
`;
