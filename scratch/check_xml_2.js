/* eslint-disable */
const fs = require('fs');

const xmlContent = `
<mxfile host="Electron" modified="2026-05-24T00:00:00.000Z" agent="5.0" version="20.0.0">
  <diagram id="get_recommendations" name="Рекомендации рецептов (getRecommendations)">
    <mxGraphModel dx="1200" dy="1800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1800" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Начало" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;fontStyle=1;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="340" y="30" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="3" value="Ввод параметров (page, limit, exclude_ids)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="270" y="120" width="260" height="60" as="geometry" />
        </mxCell>
        <mxCell id="4" value="Приведение типов и&#xa;расчёт offset = (page-1)*limit" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="280" y="210" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="5" value="Парсинг переданных exclude_ids&#xa;из строки в массив чисел" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="280" y="300" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="6" value="Запрос лайков пользователя&#xa;Like.findAll({ user_id })" style="shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="280" y="390" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="7" value="Объединение исключений:&#xa;allExcludedIds = unique(exclude_ids + likes)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="250" y="480" width="300" height="60" as="geometry" />
        </mxCell>
        <mxCell id="8" value="Есть лайкнутые&#xa;рецепты?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="300" y="570" width="200" height="80" as="geometry" />
        </mxCell>
        <mxCell id="9" value="Запрос топ-3 категорий&#xa;RecipeCategory.findAll()" style="shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="540" y="580" width="220" height="60" as="geometry" />
        </mxCell>
        <mxCell id="10" value="Извлечение catIds из&#xa;favoriteCategories" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="540" y="670" width="220" height="60" as="geometry" />
        </mxCell>
        <mxCell id="11" value="Формирование whereClause&#xa;(is_private: false, Op.notIn: allExcludedIds)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="250" y="760" width="300" height="60" as="geometry" />
        </mxCell>
        <mxCell id="12" value="catIds.length &gt; 0?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="310" y="850" width="180" height="80" as="geometry" />
        </mxCell>
        <mxCell id="13" value="orderClause = RANDOM() *&#xa;(1 + совпадения категорий)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="80" y="860" width="200" height="60" as="geometry" />
        </mxCell>
        <mxCell id="14" value="orderClause = RANDOM()" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="520" y="860" width="200" height="60" as="geometry" />
        </mxCell>
        <mxCell id="15" value="Recipe.findAll() (Этап 1)&#xa;(получение лимитированных ID)" style="shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="260" y="970" width="280" height="60" as="geometry" />
        </mxCell>
        <mxCell id="16" value="ids = recipeIdsResult.map(r =&gt; r.id)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="260" y="1060" width="280" height="60" as="geometry" />
        </mxCell>
        <mxCell id="17" value="Найдено 0 рецептов&#xa;(ids.length === 0)?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="310" y="1150" width="180" height="80" as="geometry" />
        </mxCell>
        <mxCell id="18" value="Возврат пустого ответа&#xa;res.json([])" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="80" y="1160" width="200" height="60" as="geometry" />
        </mxCell>
        <mxCell id="19" value="Recipe.findAll() (Этап 2)&#xa;(запрос полных данных по ids)" style="shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="280" y="1260" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="20" value="Прикрепление рейтингов&#xa;attachRatings(recipes, user_id)" style="shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="280" y="1350" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="21" value="Сортировка в JS в соответствии&#xa;с порядком ids первого этапа" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="260" y="1440" width="280" height="60" as="geometry" />
        </mxCell>
        <mxCell id="22" value="Возврат рекомендованных рецептов&#xa;res.json(sortedRecipes)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="260" y="1530" width="280" height="60" as="geometry" />
        </mxCell>
        <mxCell id="23" value="Конец" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;fontStyle=1;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="340" y="1620" width="120" height="60" as="geometry" />
        </mxCell>

        <!-- Catch block -->
        <mxCell id="24" value="Исключение при выполнении&#xa;(Блок catch)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="540" y="1260" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="25" value="Возврат ошибки&#xa;(500 Internal Error)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#ffffff;strokeColor=#000000;fontColor=#000000;strokeWidth=1.5;" vertex="1" parent="1">
          <mxGeometry x="540" y="1350" width="180" height="60" as="geometry" />
        </mxCell>

        <!-- Connections -->
        <mxCell id="30" parent="1" source="2" target="3" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="31" parent="1" source="3" target="4" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="32" parent="1" source="4" target="5" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="33" parent="1" source="5" target="6" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="34" parent="1" source="6" target="7" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="35" parent="1" source="7" target="8" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Likes exist branch -->
        <mxCell id="36" value="Да" parent="1" source="8" target="9" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="37" parent="1" source="9" target="10" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="38" parent="1" source="10" target="11" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;">
          <mxGeometry relative="1" as="geometry">
            <Array points="650,740;400,740" />
          </mxGeometry>
        </mxCell>
        <mxCell id="39" value="Нет" parent="1" source="8" target="11" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Where to Sorting Decision -->
        <mxCell id="40" parent="1" source="11" target="12" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="41" value="Да" parent="1" source="12" target="13" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="42" value="Нет" parent="1" source="12" target="14" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="43" parent="1" source="13" target="15" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;">
          <mxGeometry relative="1" as="geometry">
            <Array points="180,950;400,950" />
          </mxGeometry>
        </mxCell>
        <mxCell id="44" parent="1" source="14" target="15" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;">
          <mxGeometry relative="1" as="geometry">
            <Array points="620,950;400,950" />
          </mxGeometry>
        </mxCell>

        <!-- Stage 1 -> Decision Empty IDs -->
        <mxCell id="45" parent="1" source="15" target="16" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="46" parent="1" source="16" target="17" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Empty IDs No/Yes branches -->
        <mxCell id="47" value="Да" parent="1" source="17" target="18" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="48" parent="1" source="18" target="23" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;">
          <mxGeometry relative="1" as="geometry">
            <Array points="180,1650" />
          </mxGeometry>
        </mxCell>
        <mxCell id="49" value="Нет" parent="1" source="17" target="19" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;fontColor=#000000;labelBackgroundColor=#ffffff;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Stage 2 and return -->
        <mxCell id="50" parent="1" source="19" target="20" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="51" parent="1" source="20" target="21" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="52" parent="1" source="21" target="22" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="53" parent="1" source="22" target="23" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Catch block connections -->
        <mxCell id="54" parent="1" source="24" target="25" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;strokeColor=#000000;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="55" parent="1" source="25" target="23" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;">
          <mxGeometry relative="1" as="geometry">
            <Array points="630,1650" />
          </mxGeometry>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

// Pure JS parsing validation
function validateXML(xml) {
  let pos = 0;
  const stack = [];
  
  while (pos < xml.length) {
    const nextTag = xml.indexOf('<', pos);
    if (nextTag === -1) break;
    
    // Check if it's a comment
    if (xml.slice(nextTag, nextTag + 4) === '<!--') {
      const closeComment = xml.indexOf('-->', nextTag + 4);
      if (closeComment === -1) {
        console.error('Unclosed comment starting at position:', nextTag);
        process.exit(1);
      }
      pos = closeComment + 3;
      continue;
    }
    
    const closeTag = xml.indexOf('>', nextTag);
    if (closeTag === -1) {
      console.error('Unclosed tag opening at position:', nextTag);
      process.exit(1);
    }
    
    const tagContent = xml.slice(nextTag + 1, closeTag).trim();
    pos = closeTag + 1;
    
    // Check if it's a self-closing tag or XML declaration
    if (tagContent.endsWith('/') || tagContent.startsWith('?')) {
      continue;
    }
    
    // Check if it's a closing tag
    if (tagContent.startsWith('/')) {
      const tagName = tagContent.slice(1).split(/\s+/)[0];
      const expected = stack.pop();
      if (!expected || expected !== tagName) {
        console.error(`Tag mismatch: expected closure of "${expected || 'none'}", but found closure of "${tagName}" at position ${nextTag}`);
        process.exit(1);
      }
    } else {
      // Opening tag
      const tagName = tagContent.split(/[\s>]+/)[0];
      stack.push(tagName);
    }
  }
  
  if (stack.length > 0) {
    console.error('XML ended with unclosed tags:', stack);
    process.exit(1);
  }
  
  console.log('XML is perfectly valid!');
}

validateXML(xmlContent);
