const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const routes = require("./shopifyRoutes");

const app = express();
app.use(cors()); app.use(bodyParser.json({ limit: "10mb" }));

app.post("/api/shopify/create-product", routes.createProduct);
app.post("/api/cart/add", routes.cartAdd);
app.get("/api/shopify/products", routes.listProducts);
app.get("/api/shopify/products/:id/variants", routes.listVariants);

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log("Shopify proxy up on", PORT));
