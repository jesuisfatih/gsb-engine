import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Heading,
  Image,
  InlineLayout,
  Text,
  useApi,
  useCartLines,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';

// Main checkout extension component
export default reactExtension('purchase.checkout.block.render', () => <DesignPreviewBlock />);

interface DesignPreview {
  id: string;
  previewUrl: string;
  surfaceName?: string;
  dimensions?: string;
  technique?: string;
  colorCount?: number;
  printArea?: string;
  minDpi?: number;
  editUrl?: string;
}

function DesignPreviewBlock() {
  const { extension } = useApi();
  const cartLines = useCartLines();
  const settings = useSettings();

  const [designs, setDesigns] = useState<DesignPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract design IDs from cart line items
  useEffect(() => {
    const extractedDesigns: DesignPreview[] = [];

    for (const line of cartLines) {
      // Check for Design ID in line item properties
      const designIdAttr = line.attributes.find(
        (attr) => attr.key === 'Design ID' || attr.key === '_design_id'
      );

      if (!designIdAttr?.value) continue;

      const designId = designIdAttr.value;

      // Extract other properties
      const surfaceName = line.attributes.find((a) => a.key === 'Surface Label')?.value;
      const technique = line.attributes.find((a) => a.key === 'Print Technique')?.value;
      const sheetSize = line.attributes.find((a) => a.key === 'Sheet Size (mm)')?.value;
      const printArea = line.attributes.find((a) => a.key === 'Print Area (in²)')?.value;
      const colorCount = line.attributes.find((a) => a.key === 'Color Count')?.value;
      const minDpi = line.attributes.find((a) => a.key === 'Min DPI')?.value;
      const previewUrl = line.attributes.find((a) => a.key === 'Preview URL')?.value;
      const returnUrl = line.attributes.find((a) => a.key === 'Return URL')?.value;

      extractedDesigns.push({
        id: designId,
        previewUrl: previewUrl || '',
        surfaceName,
        dimensions: sheetSize,
        technique,
        colorCount: colorCount ? parseInt(colorCount) : undefined,
        printArea,
        minDpi: minDpi ? parseInt(minDpi) : undefined,
        editUrl: returnUrl,
      });
    }

    if (extractedDesigns.length > 0) {
      setDesigns(extractedDesigns);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [cartLines]);

  // Don't render if no designs
  if (loading) {
    return (
      <BlockStack spacing="base">
        <Text size="small">Loading design preview...</Text>
      </BlockStack>
    );
  }

  if (error) {
    return (
      <Banner title="Design Preview Error" status="warning">
        {error}
      </Banner>
    );
  }

  if (designs.length === 0) {
    return null; // Don't show if no custom designs in cart
  }

  const showDimensions = settings.show_dimensions ?? true;
  const showEditButton = settings.show_edit_button ?? true;
  const showDownloadButton = settings.show_download_button ?? true;
  const title = settings.title || 'Your Custom Design';

  return (
    <BlockStack spacing="base">
      <Heading level={2}>{title}</Heading>

      {designs.map((design) => (
        <BlockStack key={design.id} spacing="base" border="base" padding="base" cornerRadius="base">
          {/* Design Preview Image */}
          {design.previewUrl && (
            <Image
              source={design.previewUrl}
              alt="Design preview"
              aspectRatio={1.5}
              border="base"
              cornerRadius="base"
            />
          )}

          {/* Design Info */}
          {showDimensions && (
            <BlockStack spacing="tight">
              {design.surfaceName && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Surface:
                  </Text>
                  <Text size="small">{design.surfaceName}</Text>
                </InlineLayout>
              )}

              {design.dimensions && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Size:
                  </Text>
                  <Text size="small">{design.dimensions}</Text>
                </InlineLayout>
              )}

              {design.technique && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Technique:
                  </Text>
                  <Text size="small">{design.technique}</Text>
                </InlineLayout>
              )}

              {design.printArea && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Print Area:
                  </Text>
                  <Text size="small">{design.printArea} sq in</Text>
                </InlineLayout>
              )}

              {design.colorCount !== undefined && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Colors:
                  </Text>
                  <Text size="small">{design.colorCount}</Text>
                </InlineLayout>
              )}

              {design.minDpi && (
                <InlineLayout spacing="tight">
                  <Text size="small" emphasis="bold">
                    Quality:
                  </Text>
                  <Text size="small">{design.minDpi} DPI</Text>
                </InlineLayout>
              )}
            </BlockStack>
          )}

          {/* Action Buttons */}
          <InlineLayout spacing="base">
            {showEditButton && design.editUrl && (
              <Button
                kind="secondary"
                onPress={() => {
                  // Open editor in new tab
                  if (typeof window !== 'undefined') {
                    window.open(design.editUrl, '_blank');
                  }
                }}
              >
                Edit Design
              </Button>
            )}

            {showDownloadButton && design.previewUrl && (
              <Button
                kind="plain"
                onPress={() => {
                  // Download preview image
                  if (typeof window !== 'undefined') {
                    const link = document.createElement('a');
                    link.href = design.previewUrl!;
                    link.download = `design-${design.id}.png`;
                    link.click();
                  }
                }}
              >
                Download Preview
              </Button>
            )}
          </InlineLayout>

          {/* Quality Warning */}
          {design.minDpi && design.minDpi < 300 && (
            <Banner status="warning" title="Print Quality Notice">
              Your design has a minimum DPI of {design.minDpi}. For best print quality, we
              recommend 300 DPI or higher. The design will print as-is.
            </Banner>
          )}
        </BlockStack>
      ))}

      {/* Success Message */}
      <Banner status="success" title="Design Ready">
        Your custom design has been added to your order. Our production team will review it
        before printing.
      </Banner>
    </BlockStack>
  );
}

