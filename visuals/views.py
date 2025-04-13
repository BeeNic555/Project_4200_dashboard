from django.shortcuts import render
import pandas as pd
from django.http import JsonResponse
import os
import altair as alt
from scipy.stats import gaussian_kde
import numpy as np
from scipy.signal import find_peaks
from scipy.stats import rankdata
# views.py


def dashboard(request):
    return render(request, 'visuals/index.html')

def treemap_data(request):

    top_n_value = int(request.GET.get("top_n", 500))

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    df = df[['Name', 'Genres', 'Number_of_Reviews']].dropna()
    df['Number_of_Reviews'] = df['Number_of_Reviews'].astype(int)

    # Extract the main Genre (first)
    df['Primary_Genre'] = df['Genres'].str.split(',').str[0].str.strip()

    # Sort and select the TopN
    df['Rank'] = rankdata(-df['Number_of_Reviews'], method='ordinal')
    top_df = df[df['Rank'] <= top_n_value]

    # Count the number of occurrences of the first genre
    genre_counts = top_df['Primary_Genre'].value_counts().reset_index()
    genre_counts.columns = ['Genre', 'Count']

    # plot treemap
    children = []
    for _, row in genre_counts.iterrows():
        children.append({
            'name': row['Genre'],
            'value': row['Count']
        })

    treemap_structure = {
        'name': f'Top {top_n_value} Genres',
        'children': children
    }

    return JsonResponse(treemap_structure)

def sankey_data(request):
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    # Keep only useful fields and remove missing values
    df = df[['Genres', 'Review_Summary']].dropna()

    valid_reviews = [
        "Overwhelmingly Positive", "Very Positive", "Positive",
        "Mostly Positive", "Mixed", "Negative",
        "Mostly Negative", "Overwhelmingly Negative"
    ]
    df = df[df['Review_Summary'].isin(valid_reviews)]

    # Split the first main genre and create a source-target pair
    rows = []
    for _, row in df.iterrows():
        genre = row['Genres'].split(',')[0].strip()
        review = row['Review_Summary'].strip()
        rows.append({'source': genre, 'target': review})

    sankey_df = pd.DataFrame(rows)

    # nodes
    genres = sorted(sankey_df['source'].unique())
    reviews = [r for r in valid_reviews if r in sankey_df['target'].unique()]
    all_nodes = genres + reviews
    node_map = {name: idx for idx, name in enumerate(all_nodes)}
    nodes = [{'name': name} for name in all_nodes]

    grouped = sankey_df.groupby(['source', 'target']).size().reset_index(name='value')

    # Calculate the total number of each genre to calculate the scale
    grouped['genre_total'] = grouped.groupby('source')['value'].transform('sum')
    grouped['percentage'] = grouped.apply(lambda row:
                                          row['value'] / row['genre_total'] if row['genre_total'] > 0 else 0, axis=1
                                          )

    # Builds links, including the percentage field
    links = grouped.apply(lambda row: {
        'source': node_map[row['source']],
        'target': node_map[row['target']],
        'value': row['value'],
        'percentage': round(row['percentage'], 4)
    }, axis=1).tolist()

    return JsonResponse({'nodes': nodes, 'links': links})

def line_data(request):
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    if 'Release_Date' not in df.columns or 'Number_of_Reviews' not in df.columns or 'Name' not in df.columns:
        return JsonResponse({'error': 'Required columns not found'}, status=400)

    # 预处理
    df['Release_Date'] = pd.to_datetime(df['Release_Date'], errors='coerce')
    df = df.dropna(subset=['Release_Date', 'Number_of_Reviews'])

    df['Year'] = df['Release_Date'].dt.year
    df['Month'] = df['Release_Date'].dt.month

    # 找出每月评论最多的游戏
    top_game = df.sort_values('Number_of_Reviews', ascending=False).groupby(['Year', 'Month']).first().reset_index()
    top_game = top_game[['Year', 'Month', 'Name']].rename(columns={'Name': 'Top_Game'})

    # 每月总评论数
    reviews_sum = df.groupby(['Year', 'Month'])['Number_of_Reviews'].sum().reset_index()

    # 合并
    merged = pd.merge(reviews_sum, top_game, on=['Year', 'Month'], how='left')

    return JsonResponse(merged.to_dict(orient='records'), safe=False)


def altair_histogram(request):
    # get TopN parameters to facilitate js rendering dynamic changes of web pages
    top_n_value = int(request.GET.get("top_n", 100))

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    df = df[df['Price'].notna() & df['Number_of_Reviews'].notna()]
    df['Price'] = df['Price'].astype(float)
    df['Number_of_Reviews'] = df['Number_of_Reviews'].astype(int)
    df = df[df['Price'] <= 100]
    df['Rank'] = df['Number_of_Reviews'].rank(method='first', ascending=False)

    bin_width = 5
    max_price = int(np.ceil(df[df['Rank'] <= 1000]['Price'].max() / 10.0)) * 10
    x_vals = np.linspace(0, max_price, 200)

    # calculate KDE
    filtered = df[df['Rank'] <= top_n_value]
    kde = gaussian_kde(filtered['Price'], bw_method=0.4)
    y_vals = kde(x_vals)
    y_scaled = y_vals * len(filtered) * bin_width
    kde_df = pd.DataFrame({'Price': x_vals, 'Density': y_scaled})

    # Find KDE inflection points (local peaks)
    peaks, _ = find_peaks(y_scaled)
    peak_df = pd.DataFrame({
        'Price': x_vals[peaks],
        'Density': y_scaled[peaks]
    })

    # Altair
    base = alt.Chart(filtered)

    bars = base.mark_bar(
        color='steelblue',
        opacity=0.6,
        stroke='white',
        strokeWidth=1
    ).encode(
        x=alt.X('Price:Q',
                bin=alt.Bin(step=bin_width),
                scale=alt.Scale(domain=[0, max_price]),
                title='Price Range (USD)',
                axis=alt.Axis(labelFontSize=14,
                              labelFontStyle='italic',
                              labelAngle=45,
                              titleFontSize=16)
                ),
        y=alt.Y('count():Q', title='Number of Games', axis=alt.Axis(labelFontSize=14,titleFontSize=16)),
        tooltip=[alt.Tooltip('count():Q', title='Game Count'), alt.Tooltip('Price:Q', title='Price')]
    )

    kde_line = alt.Chart(kde_df).mark_line(
        color='crimson',
        strokeWidth=3
    ).encode(
        x='Price:Q',
        y='Density:Q'
    )

    # Inflection layer
    peak_layer = alt.Chart(peak_df).mark_point(
        filled=True,
        shape='diamond',
        color='green',
        size=300
    ).encode(
        x='Price:Q',
        y='Density:Q',
        tooltip=[alt.Tooltip('Price:Q', title='Peak Price'), alt.Tooltip('Density:Q', title='Density')]
    )

    chart = (bars + kde_line + peak_layer).properties(
        width=700,
        height=400,
        title=alt.TitleParams(
            text=f'Price Distribution of Most Reviewed VR Games (Top {top_n_value})',
            fontSize=20,
            fontWeight='bold')
    )

    return JsonResponse(chart.to_dict())

def altair_scatter(request):
    top_n_value = int(request.GET.get("top_n", 100))
    genre_filter = request.GET.get("genre", "All")

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    # Leave necessary fields non-empty
    df = df[df['Price'].notna() & df['Number_of_Reviews'].notna() & df['Review_Summary'].notna()]
    df['Price'] = df['Price'].astype(float)
    df['Number_of_Reviews'] = df['Number_of_Reviews'].astype(int)

    # Filter games priced over 200
    df = df[df['Price'] <= 200]

    # get the first genre for each game
    df['Primary Genre'] = df['Genres'].str.split(',').str[0].str.strip()

    # Rank and filter the Top N
    df['Rank'] = df['Number_of_Reviews'].rank(method='first', ascending=False)
    df_filtered = df[df['Rank'] <= top_n_value]

    # Filter by genre
    if genre_filter != "All":
        df_filtered = df_filtered[df_filtered['Primary Genre'] == genre_filter]

    # plot scatter
    scatter = alt.Chart(df_filtered).mark_circle(opacity=0.7).encode(
        x=alt.X('Price:Q', title='Price (USD)', axis=alt.Axis(labelFontSize=14, labelFontStyle='italic', labelAngle=45, titleFontSize=16)),
        y=alt.Y('Number_of_Reviews:Q', title='Number of Reviews', axis=alt.Axis(labelFontSize=14, titleFontSize=16)),
        color=alt.Color('Review_Summary:N', legend=alt.Legend(title='Review Summary')),
        tooltip=['Name:N', 'Price:Q', 'Number_of_Reviews:Q', 'Review_Summary:N', 'Primary Genre:N']
    ).interactive().properties(
        width=700,
        height=400,
        title=alt.TitleParams(
            text=f'Top {top_n_value} VR Games: Price vs. Reviews',
            fontSize=20,
            fontWeight='bold'
        )
    )

    return JsonResponse(scatter.to_dict())

def altair_bar_chart(request):

    top_n_value = int(request.GET.get("top_n", 100))

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(BASE_DIR, 'VR_Game_data_2280.csv')
    df = pd.read_csv(csv_path)

    # clean data
    df = df[df['Price'].notna() & df['Number_of_Reviews'].notna() & df['Genres'].notna()]
    df['Price'] = df['Price'].astype(float)
    df['Number_of_Reviews'] = df['Number_of_Reviews'].astype(int)
    df['Main_Genre'] = df['Genres'].str.split(',').str[0].str.strip()

    # Select the top top_n_value games according to the number of comments
    df['Rank'] = rankdata(-df['Number_of_Reviews'], method='ordinal')
    top_df = df[df['Rank'] <= top_n_value]

    # Count how often the main genre appears in Top N games
    genre_counts = top_df['Main_Genre'].value_counts().reset_index()
    genre_counts.columns = ['Genre', 'Count']

    # bar plot
    chart = alt.Chart(genre_counts).mark_bar(color='#4C78A8').encode(
        x=alt.X('Genre:N', sort='-y', title='Main Genre', axis=alt.Axis(labelFontSize=14,
                                                                        labelFontStyle='italic',
                                                                        labelAngle=45,
                                                                        titleFontSize=16)),
        y=alt.Y('Count:Q', title='Number of Games', axis=alt.Axis(labelFontSize=14,titleFontSize=16)),
        tooltip=['Genre:N', 'Count:Q']
    ).properties(
        width=600,
        height=400,
        title=alt.TitleParams(
            text=f"Top {top_n_value} Games: Frequency of Each Main Genre",
            fontSize=20,
            fontWeight='bold'
        )
    )

    return JsonResponse(chart.to_dict())
