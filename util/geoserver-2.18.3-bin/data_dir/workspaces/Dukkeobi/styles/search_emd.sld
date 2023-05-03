<?xml version="1.0" encoding="ISO-8859-1"?>
<StyledLayerDescriptor version="1.0.0"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <NamedLayer>
    <Name>search_emd</Name>
    <UserStyle>
      <Title>A violet polygon style</Title>
      <FeatureTypeStyle>
        <Rule>
          <Title>violet polygon</Title>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#9fc5e8</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <TextSymbolizer>
           <Geometry>
            <ogc:Function name="centroid">
             <ogc:PropertyName>geom</ogc:PropertyName>
            </ogc:Function>
           </Geometry>
           <Label>
            <ogc:PropertyName>adm_nm</ogc:PropertyName>
           </Label>
           <Font>
            <CssParameter name="font-family">¸¼Àº °íµñ BOLD</CssParameter>
            <CssParameter name="font-size">12</CssParameter>
            <CssParameter name="font-style">normal</CssParameter>
            <CssParameter name="font-weight">bold</CssParameter>
           </Font>
          </TextSymbolizer>          
        </Rule>
        
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>