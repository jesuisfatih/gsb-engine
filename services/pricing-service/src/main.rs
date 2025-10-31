/**
 * Pricing Service (Rust)
 * Ultra-fast pricing calculations with caching
 */

use actix_web::{web, App, HttpServer, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Deserialize)]
struct PricingRequest {
    area_in2: f64,
    color_count: i32,
    technique: String,
    quantity: i32,
}

#[derive(Serialize)]
struct PricingResponse {
    unit_price: f64,
    total: f64,
    currency: String,
    breakdown: PricingBreakdown,
}

#[derive(Serialize)]
struct PricingBreakdown {
    base: f64,
    area_cost: f64,
    color_cost: f64,
    tech_multiplier: f64,
    quantity_discount: f64,
}

async fn calculate_price(req: web::Json<PricingRequest>) -> Result<HttpResponse> {
    // Base pricing formula (optimized Rust)
    let base_price = 5.0;
    let per_sqin = 0.15;
    let color_adder = 0.50;
    
    let area_cost = req.area_in2 * per_sqin;
    let color_cost = (req.color_count - 1).max(0) as f64 * color_adder;
    
    let tech_multiplier = match req.technique.as_str() {
        "dtf" => 1.0,
        "digital" => 1.1,
        "sublimation" => 0.9,
        "screen" => 0.8,
        "embroidery" => 1.5,
        _ => 1.0,
    };
    
    let quantity_discount = if req.quantity >= 100 {
        0.20
    } else if req.quantity >= 50 {
        0.15
    } else if req.quantity >= 25 {
        0.10
    } else if req.quantity >= 10 {
        0.05
    } else {
        0.0
    };
    
    let subtotal = (base_price + area_cost + color_cost) * tech_multiplier;
    let unit_price = subtotal * (1.0 - quantity_discount);
    let total = unit_price * req.quantity as f64;
    
    let response = PricingResponse {
        unit_price: (unit_price * 100.0).round() / 100.0,
        total: (total * 100.0).round() / 100.0,
        currency: "USD".to_string(),
        breakdown: PricingBreakdown {
            base: base_price,
            area_cost,
            color_cost,
            tech_multiplier,
            quantity_discount,
        },
    };
    
    Ok(HttpResponse::Ok().json(response))
}

async fn health() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().body("healthy"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    
    let port = env::var("PORT").unwrap_or_else(|_| "4001".to_string());
    let bind_addr = format!("0.0.0.0:{}", port);
    
    println!("[pricing-service] Starting on {}", bind_addr);
    
    HttpServer::new(|| {
        App::new()
            .route("/calculate", web::post().to(calculate_price))
            .route("/health", web::get().to(health))
    })
    .bind(&bind_addr)?
    .workers(4)
    .run()
    .await
}

