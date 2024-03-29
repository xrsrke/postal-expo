import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	Image,
	ImageBackground,
	TouchableOpacity,
	Dimensions,
	SafeAreaView,
	Alert,
	Keyboard,
	KeyboardAvoidingView,
	TouchableWithoutFeedback,
	ScrollView,
} from "react-native";
import { connect } from "react-redux";

import * as Location from "expo-location";
import * as Permissions from "expo-permissions";
import {
	Layout,
	Input,
	Button,
	Text,
	Icon,
	TopNavigation,
	TopNavigationAction,
	OverflowMenu,
	MenuItem,
	Divider,
	Select,
	SelectItem,
	IndexPath,
} from "@ui-kitten/components";
import axios from "axios";

import HTTPRequest from "../../functions/httpRequest.js";

import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import Spinner from "react-native-loading-spinner-overlay";

import Geocode from "react-geocode";
import MapView, { Marker } from "react-native-maps";

// fonts
import { Ionicons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";

import { useMutation, useLazyQuery } from "@apollo/client";

import {
	isEmpty,
	isMin,
	isMax,
	isPhoneNumber,
	allLetterNumeric,
	allNumeric,
} from "../../functions/strings";

import {
	MUTATION_CREATE_POSTAL,
	QUERY_GET_POSTAL,
	MUTATION_UPDATE_POSTAL,
} from "../../graphql/query";

import appConfigs from "../../config";
import { saveUserdata } from "../../functions/helpers";
import DataPostalLevel1 from "./data/postal_level_1.json";

Geocode.setApiKey(appConfigs.GOOGLE_MAP.API_KEY_2);

const BackIcon = (props) => <Icon {...props} name="arrow-back" />;

const MenuIcon = (props) => <Icon {...props} name="more-vertical" />;

const InfoIcon = (props) => <Icon {...props} name="info" />;

function createPostalLocationScreen(props) {
	const mapRef = useRef(null);
	let refX = useRef();

	const [
		createPostal,
		{ loading: queryLoading, error: queryError, data: dataCreatePostal },
	] = useMutation(MUTATION_CREATE_POSTAL, {
		onCompleted: (dataCreatePostal) => {
			setLoading(false);
			console.log("onCompleted");
			console.log(dataCreatePostal);

			if (dataCreatePostal.insert_postals.returning[0].id) {
				saveUserdata(
					dataCreatePostal.insert_postals.returning[0].user,
					props
				);
				props.navigation.navigate("MyPostal");
			} else {
				console.log("some errror in response");
			}
		},
		onError: (queryError) => {
			setTimeout(function () {
				Alert.alert("Có lỗi xảy ra");
			}, 700);
			console.log("onError");
			console.log(queryError);
		},
	});

	const [
		getPostal,
		{
			error: errorGet,
			called: calledGet,
			loading: loadingGet,
			data: dataGet,
		},
	] = useLazyQuery(QUERY_GET_POSTAL, {
		fetchPolicy: "no-cache",
		onCompleted: (dataGet) => {
			setLoading(false);
			console.log("dataGet");
			console.log(dataGet);
			console.log(dataGet.postals[0].name);

			setNameInput(dataGet.postals[0].name);
			setAddressInput(dataGet.postals[0].address);

			setCodeArea(dataGet.postals[0].code_area);
			setCodeLevel1(dataGet.postals[0].area_level1_code);
			setCodeLevel2(dataGet.postals[0].area_level2_code);
			setCodeLevel3(dataGet.postals[0].area_level3_code);

			// setIndexLevel1(new IndexPath(parseInt(dataGet.postals[0].area_level1_index)));
			// setIndexLevel2(new IndexPath(parseInt(dataGet.postals[0].area_level2_index)));
			// setIndexLevel3(new IndexPath(parseInt(dataGet.postals[0].area_level3_index)));

			// setIndexLevel1(parseInt(dataGet.postals[0].area_level1_index));
			// setIndexLevel2(parseInt(dataGet.postals[0].area_level2_index));
			// setIndexLevel3(parseInt(dataGet.postals[0].area_level3_index));

			// console.log(114, indexLevel1, dataGet.postals[0].area_level1_index)

			updateF();
			// selectAreaLevel1(
			// 	parseInt(dataGet.postals[0].area_level1_index)
			// ).then(() => {
			// 	// selectAreaLevel2(indexLevel2).then(() => {
			// 	// 	selectAreaLevel3(indexLevel3);
			// 	// });
			// });

			// setTimeout(() => {
			// 	selectAreaLevel2(
			// 		parseInt(dataGet.postals[0].area_level2_index)
			// 	).then(() => {
			// 		// selectAreaLevel3(indexLevel3);
			// 	});
			// }, 5000);

			// setTimeout(() => {
			// 	selectAreaLevel3(indexLevel3);
			// }, 4000);

			// setPhoneInput(dataGet.postals[0].phone);
			// mapRef.current?.setAddressText(dataGet.postals[0].address);
			setCurrentLat(dataGet.postals[0].lat);
			setCurrentLong(dataGet.postals[0].lng);
		},
		onError: (errorGet) => {
			setLoading(false);
			setTimeout(function () {
				Alert.alert("Có lỗi xảy ra");
			}, 700);
			console.log("onError");
			console.log(errorPostal);
		},
	});

	const [
		updatePostal,
		{
			error: errorUpdate,
			called: calledUpdate,
			loading: loadingUpdate,
			data: dataUpdate,
		},
	] = useMutation(MUTATION_UPDATE_POSTAL, {
		fetchPolicy: "no-cache",
		onCompleted: (dataUpdate) => {
			console.log("dataUpdate");
			console.log(dataUpdate);
			setLoading(false);

			if (dataUpdate.update_postals.returning[0].id) {
				saveUserdata(
					dataUpdate.update_postals.returning[0].user,
					props
				);
				props.navigation.navigate("MyPostal");
			} else {
				console.log("some errror in response");
			}
		},
		onError: (errorPostal) => {
			setLoading(false);
			setTimeout(function () {
				Alert.alert("Có lỗi xảy ra");
			}, 700);
		},
	});

	const [mapWidth, setMapWidth] = useState(Dimensions.get("window").width);
	const [mapHeight, setMapHeight] = useState(200);
	const [mapType, setMapType] = useState("standard");
	const [mapFull, setMapFull] = useState(false);

	const [indexLevel1, setIndexLevel1] = useState(new IndexPath(0));
	const [codeLevel1, setCodeLevel1] = useState();
	const [displayLevel1, setDisplayLevel1] = useState("Chọn tỉnh/thành phố");

	const [indexLevel2, setIndexLevel2] = useState(new IndexPath(0));
	const [codeLevel2, setCodeLevel2] = useState();
	const [displayLevel2, setDisplayLevel2] = useState("Chọn quận/huyện");
	const [dataPostalLevel2, setDataPostalLevel2] = useState([]);

	const [indexLevel3, setIndexLevel3] = useState(new IndexPath(0));
	const [codeLevel3, setCodeLevel3] = useState();
	const [displayLevel3, setDisplayLevel3] = useState("Chọn phường/xã");
	const [nameLevel3, setNameLevel3] = useState();
	const [dataPostalLevel3, setDataPostalLevel3] = useState([]);

	const [codeArea, setCodeArea] = useState("Chưa chọn");

	const [nameInput, setNameInput] = useState("");
	// const [phoneInput, setPhoneInput] = useState("");
	const [addressInput, setAddressInput] = useState("");

	const [currentLat, setCurrentLat] = useState(21.0285619);
	const [currentLong, setCurrentLong] = useState(105.8556549);
	const [loadingAddress, setLoadingAddress] = useState(false);
	const [loading, setLoading] = useState(false);

	const [menuVisible, setMenuVisible] = useState(false);
	const [isMain, setIsMain] = useState(true);

	let isUpdate = props.route.params.isUpdate;

	useEffect(() => {
		if (!props.infos) {
			props.navigation.navigate("SignIn");
			return;
		} else if (props.infos.is_actived == 0) {
			props.navigation.navigate("VerifyPhoneNumber");
			setTimeout(() => {
				Alert.alert("Vui lòng xác thực tài khoản trước");
			}, 800);
			return;
		}

		if (props.route.params.isUpdate == true) {
			getPostal({ variables: { id: props.route.params.postal.id } });
		} else {
			async function askPermissions() {
				var response = await Permissions.askAsync(Permissions.LOCATION);

				console.log("askPermissions response");
				console.log(response);

				if (response.status == "granted") {
					setLoadingAddress(true);
					console.log("askPermissions granted");

					let location = await Location.getCurrentPositionAsync();
					console.log(3123123123123, location);
					// setCurrentLocation(location);

					// Location.watchPositionAsync({ distanceInterval: 10 }, (location) => {
					// 	console.log(
					// 		"askPermissions here location: ",
					// 		location.coords.latitude,
					// 		location.coords.longitude
					// 	);

					// if (
					// 	location.coords.latitude != null &&
					// 	location.coords.longitude != null
					// ) {

					setCurrentLat(location.coords.latitude);
					setCurrentLong(location.coords.longitude);

					mapRef.current.animateToRegion({
						latitude: parseFloat(location.coords.latitude),
						longitude: parseFloat(location.coords.longitude),
						latitudeDelta: appConfigs.GOOGLE_MAP.latitudeDelta,
						longitudeDelta: appConfigs.GOOGLE_MAP.longitudeDelta,
					});
					// }

					// fetchAddress(
					// 	location.coords.latitude,
					// 	location.coords.longitude
					// );

					// });
				} else {
					console.log("else");
				}
			}

			askPermissions();
		}
	}, []);

	async function fetchAddress(lat, lng) {
		Geocode.fromLatLng(lat, lng).then(
			(response) => {
				// console.log(105, response);

				const address = response.results[0].formatted_address;
				// setAddressInput(address);
				// mapRef.current?.setAddressText(address);
				setLoadingAddress(false);
				console.log(222, response);
				console.log(333, address);
			},
			(error) => {
				console.error(error);
			}
		);
	}

	async function fetchGeocode(address) {
		let coordinates = [];

		await axios({
			method: "get",
			url:
				"https://maps.vietmap.vn/api/search?api-version=1.1&apikey=6f5bf21b9c50883b38af007b6570d719317a96778d1e6149&text=" +
				address +
				"&size=1&categories=",
			headers: {
				accept: "text/plain",
			},
		})
			.then((data) => {
				console.log(349, data);
				coordinates = data.data.data.features[0].geometry.coordinates;

				setCurrentLat(parseFloat(coordinates[1]));
				setCurrentLong(parseFloat(coordinates[0]));

				mapRef.current.animateToRegion({
					latitude: parseFloat(coordinates[1]),
					longitude: parseFloat(coordinates[0]),
					latitudeDelta: 0.00322,
					longitudeDelta: 0.00321,
					// latitudeDelta: 0.009,
					// longitudeDelta: 0.001,
				});

				// setDataPostalLevel2(data.data);
			})
			.catch((e) => {
				// console.log("error", e);
			});

		// Geocode.fromAddress(address).then(
		// 	(response) => {
		// 		const { lat, lng } = response.results[0].geometry.location;
		// 		console.log(22222222, lat, lng);

		// 		setCurrentLat(lat);
		// 		setCurrentLong(lng);

		// 		let markers = {
		// 			latitude: parseFloat(lat),
		// 			longitude: parseFloat(lng),
		// 		};

		// 		// mapRef.current.fitToCoordinates(true)

		// 		// mapRef.fitToSuppliedMarkers(
		// 		// 	markers.map(({ _id }) => _id)
		// 		// );
		// 		// refX.fitToSuppliedMarkers(members.map(m => m.id), true);
		// 		mapRef.current.animateToRegion({
		// 			latitude: parseFloat(lat),
		// 			longitude: parseFloat(lng),
		// 			latitudeDelta: 0.0122,
		// 			longitudeDelta: 0.0121,
		// 			// latitudeDelta: 0.009,
		// 			// longitudeDelta: 0.001,
		// 		});
		// 	},
		// 	(error) => {
		// 		console.error(error);
		// 	}
		// );
	}

	async function updateF() {
		setIndexLevel1(new IndexPath(dataGet.postals[0].area_level1_index));

		setDisplayLevel1(
			DataPostalLevel1[dataGet.postals[0].area_level1_index]["name"]
		);

		console.log("selectAreaLevel1[0]");
		console.log(dataGet.postals[0]);
		console.log(DataPostalLevel1);
		console.log(
			"selectAreaLevel1",
			dataGet.postals[0].area_level1_index,
			DataPostalLevel1[dataGet.postals[0].area_level1_index]["name"]
		);

		// fetchGeocode(DataPostalLevel1[index.row]["name"])
		axios({
			method: "post",
			url:
				"https://asia-south1-titanium-vision-273216.cloudfunctions.net/function-postal-state",
			headers: {
				accept: "text/plain",
			},
			data: {
				code: dataGet.postals[0].area_level1_code,
			},
		})
			.then((dataResponse1) => {
				console.log("dataResponse1");
				setDataPostalLevel2(dataResponse1.data);

				// console.log(346, dataPostalLevel2);

				// console.log("selectAreaLevel2[1]", dataResponse1.data);
				// console.log("selectAreaLevel2[1][1]", dataPostalLevel2);
				// console.log(
				// 	"selectAreaLevel2[2]",
				// 	dataGet.postals[0].area_level2_index
				// 	// dataPostalLevel2[dataGet.postals[0].area_level2_index][
				// 	// 	"name"
				// 	// ]
				// );

				setIndexLevel2(
					new IndexPath(dataGet.postals[0].area_level2_index)
				);

				// console.log(
				// 	357,
				// 	dataGet.postals[0].area_level2_index,
				// 	// dataPostalLevel2[dataGet.postals[0].area_level2_index][
				// 	// 	"name"
				// 	// ]
				// );

				console.log(
					377,
					dataResponse1.data[dataGet.postals[0].area_level2_index][
						"name"
					]
				);

				setDisplayLevel2(
					dataResponse1.data[dataGet.postals[0].area_level2_index][
						"name"
					].replace("tỉnh " + displayLevel1)
				);

				// fetchGeocode(dataPostalLevel2[dataGet.postals[0].area_level2_index]["name"]);
				axios({
					method: "post",
					url:
						"https://asia-south1-titanium-vision-273216.cloudfunctions.net/function-postal-state",
					headers: {
						accept: "text/plain",
					},
					data: {
						code: dataGet.postals[0].area_level2_code,
					},
				})
					.then((dataResponse2) => {
						console.log("dataResponse2");
						console.log("dataResponse2", dataResponse2);
						setDataPostalLevel3(dataResponse2.data);

						// setTimeout(function () {
						// 	console.log(391, dataPostalLevel2);
						// }, 5000);

						setIndexLevel3(
							new IndexPath(dataGet.postals[0].area_level3_index)
						);

						setDisplayLevel3(
							dataResponse2.data[
								dataGet.postals[0].area_level3_index
							]["name"]
							// .replace("tỉnh " + displayLevel1)
						);

						// setDisplayLevel3(
						// 	dataPostalLevel3[
						// 		dataGet.postals[0].area_level3_index
						// 	]["name"]
						// 		.replace("tỉnh " + displayLevel1, "")
						// 		.replace(displayLevel2, "")
						// );

						// setNameLevel3(
						// 	dataPostalLevel3[
						// 		dataGet.postals[0].area_level3_index
						// 	]["name"]
						// );

						// setCodeArea(
						// 	dataPostalLevel3[
						// 		dataGet.postals[0].area_level3_index
						// 	]["postcode"]
						// );

						// fetchGeocode(dataPostalLevel3[dataGet.postals[0].area_level3_index]["name"]);
					})
					.catch((e) => {
						console.log("error", e);
					});
			})
			.catch((e) => {
				// console.log("error", e);
			});
	}

	async function selectAreaLevel1(index) {
		// console.log("selectAreaLevel1=>index", index);

		setIndexLevel1(new IndexPath(index));

		setDisplayLevel1(DataPostalLevel1[index]["name"]);
		setCodeLevel1(DataPostalLevel1[index]["code"]);

		setIndexLevel2(new IndexPath(0));
		setDisplayLevel2("Chọn quận/huyện");
		setDataPostalLevel2([]);
		setCodeLevel2("");
		setIndexLevel3(new IndexPath(0));
		setDisplayLevel3("Chọn phường/xã");
		setDataPostalLevel3([]);
		setCodeLevel3("");

		setCodeArea(DataPostalLevel1[index]["code"]);

		console.log(
			"selectAreaLevel1: ",
			index,
			DataPostalLevel1[index]["code"]
		);

		fetchGeocode(DataPostalLevel1[index]["name"]);

		await axios({
			method: "post",
			url:
				"https://asia-south1-titanium-vision-273216.cloudfunctions.net/function-postal-state",
			headers: {
				accept: "text/plain",
			},
			data: {
				code: DataPostalLevel1[index]["code"],
			},
		})
			.then((data) => {
				console.log(data);
				setDataPostalLevel2(data.data);
			})
			.catch((e) => {
				console.log("error", e);
			});
	}

	async function selectAreaLevel2(index) {
		console.log(332, "selectAreaLevel2", index);
		console.log(333, "selectAreaLevel2", dataPostalLevel2);

		setIndexLevel2(new IndexPath(index));
		setDisplayLevel2(
			dataPostalLevel2[index]["name"].replace("tỉnh " + displayLevel1, "")
		);
		setCodeLevel2(dataPostalLevel2[index]["postcode"]);

		setIndexLevel3(new IndexPath(0));
		setDisplayLevel3("Chọn phường/xã");
		setDataPostalLevel3([]);
		setCodeLevel3("");

		setCodeArea(dataPostalLevel2[index]["postcode"]);

		console.log("setDisplayLevel2");
		console.log(333333332, dataPostalLevel2);
		// console.log('setDisplayLevel2', index, dataPostalLevel2[index]["code"])

		fetchGeocode(dataPostalLevel2[index]["name"]);
		await axios({
			method: "post",
			url:
				"https://asia-south1-titanium-vision-273216.cloudfunctions.net/function-postal-state",
			headers: {
				accept: "text/plain",
			},
			data: {
				code: dataPostalLevel2[index]["postcode"],
			},
		})
			.then((data) => {
				console.log(data);
				// console.log("data", data);
				setDataPostalLevel3(data.data);
			})
			.catch((e) => {
				console.log("error", e);
			});
	}

	async function selectAreaLevel3(index) {
		setIndexLevel3(new IndexPath(index));
		setDisplayLevel3(
			dataPostalLevel3[index]["name"]
				.replace("tỉnh " + displayLevel1, "")
				.replace(displayLevel2, "")
		);

		setNameLevel3(dataPostalLevel3[index]["name"]);
		setCodeLevel3(dataPostalLevel3[index]["postcode"]);

		console.log(
			601,
			dataPostalLevel3[index]["postcode"],
			dataPostalLevel3[index]["name"]
		);

		setCodeArea(dataPostalLevel3[index]["postcode"]);

		fetchGeocode(dataPostalLevel3[index]["name"]);
	}

	// if (queryLoading) return <Text>Loading...</Text>;
	// if (queryError) {
	//     console.log('queryError')
	//     console.log(queryError)
	// }

	// if (dataCreatePostal) {
	//     console.log('dataCreatePostal')
	//     console.log(dataCreatePostal)
	// }

	function onClickCreate() {
		// console.log(132, props.infos);

		if (!nameInput.trim()) {
			Alert.alert("Vui lòng nhập tên địa điểm");
			return;
		} else if (allLetterNumeric(nameInput.trim()) == false) {
			Alert.alert("Tên địa điểm chỉ gồm chữ và số");
			return;
		} else if (
			isMin(nameInput, appConfigs.VALIDATE.POSTAL.MIN_NAME) == false ||
			isMax(nameInput, appConfigs.VALIDATE.POSTAL.MAX_NAME) == false
		) {
			Alert.alert(
				"Tên địa điểm từ " +
					appConfigs.VALIDATE.POSTAL.MIN_NAME +
					" đến " +
					appConfigs.VALIDATE.POSTAL.MAX_NAME +
					" ký tự"
			);
			return;
		}

		// else if (!phoneInput.trim()) {
		// 	Alert.alert("Vui lòng nhập số điện thoại");
		// 	return;
		// }

		// else if (isPhoneNumber(phoneInput) == false) {
		// 	Alert.alert("Số điện thoại không hợp lệ");
		// 	return;
		// }
		else if (!codeLevel1.trim()) {
			Alert.alert("Vui lòng chọn tỉnh/thành phố");
			return;
		} else if (!codeLevel2.trim()) {
			Alert.alert("Vui lòng chọn quận/huyện");
			return;
		} else if (!codeLevel3.trim()) {
			Alert.alert("Vui lòng chọn phường/xã");
			return;
		} else if (!addressInput.trim()) {
			Alert.alert("Vui lòng nhập địa chỉ");
			return;
		} else if (
			isMin(addressInput, 6) == false ||
			isMax(addressInput, 100) == false
		) {
			Alert.alert("Địa chỉ từ 6 đến 100 ký tự");
			return;
		}

		console.log(264, {
			// id: props.route.params.postal.id,
			name: nameInput,
			// phone: phoneInput.toString(),
			address: addressInput,
			code_area: codeArea,
			area_level1_index: parseInt(indexLevel1) - 1,
			area_level2_index: parseInt(indexLevel2) - 1,
			area_level3_index: parseInt(indexLevel3) - 1,
			area_level1_code: codeLevel1,
			area_level2_code: codeLevel2,
			area_level3_code: codeLevel3,
			area_text: dataPostalLevel3[indexLevel3 - 1]["name"],
			lat: currentLat.toString(),
			lng: currentLong.toString(),
		});

		setLoading(true);

		if (isUpdate == true) {
			console.log("update postal");

			updatePostal({
				variables: {
					id: props.route.params.postal.id,
					name: nameInput,
					// phone: phoneInput.toString(),
					address: addressInput,
					code_area: codeArea,
					area_text: dataPostalLevel3[indexLevel3 - 1]["name"],
					area_level1_index: parseInt(indexLevel1) - 1,
					area_level2_index: parseInt(indexLevel2) - 1,
					area_level3_index: parseInt(indexLevel3) - 1,
					area_level1_code: codeLevel1,
					area_level2_code: codeLevel2,
					area_level3_code: codeLevel3,
					lat: currentLat.toString(),
					lng: currentLong.toString(),
				},
			});
		} else {
			fetchGeocode(addressInput + " ," + nameLevel3).then(() => {
				console.log("done fetchGeocode.then");
				createPostal({
					variables: {
						name: nameInput,
						// phone: phoneInput.toString(),
						address: addressInput,
						code_area: codeArea,
						area_text: dataPostalLevel3[indexLevel3 - 1]["name"],
						// area_level1_index: parseInt(indexLevel1),
						// area_level2_index: parseInt(indexLevel2),
						// area_level3_index: parseInt(indexLevel3),
						area_level1_index: parseInt(indexLevel1) - 1,
						area_level2_index: parseInt(indexLevel2) - 1,
						area_level3_index: parseInt(indexLevel3) - 1,
						area_level1_code: codeLevel1,
						area_level2_code: codeLevel2,
						area_level3_code: codeLevel3,
						type: 99,
						image_url: "https://i.imgur.com/fkmKq6F.png",
						lat: currentLat.toString(),
						lng: currentLong.toString(),
						uid: props.infos.id,
					},
				});
			});
		}
	}

	function onClickUpdate() {}

	const onClickZoom = () => {
		if (mapFull == false) {
			setMapHeight(Dimensions.get("window").height);
			setMapFull(true);
		} else {
			setMapHeight(200);
			setMapFull(false);
		}
	};

	const ZoomIcon = (props) => (
		<Icon
			{...props}
			name={mapFull == false ? "maximize-outline" : "minimize-outline"}
		/>
	);

	const MapIcon = (props) => (
		<Icon
			{...props}
			name={
				mapType == "standard"
					? "toggle-right-outline"
					: "toggle-left-outline"
			}
		/>
	);

	const onClickMapType = () => {
		if (mapType == "standard") {
			setMapType("satellite");
		} else {
			setMapType("standard");
		}
	};

	if (!props.infos) {
		props.navigation.navigate("SignIn");
	}

	const renderPhotoButton = () => (
		<Button
			style={styles.photoButton}
			size="small"
			status="basic"
			icon={CameraIcon}
		/>
	);

	const renderBackAction = () => (
		<TopNavigationAction
			icon={BackIcon}
			onPress={() =>
				isUpdate == true
					? props.navigation.navigate("MyPostal")
					: props.navigation.navigate("More")
			}
		/>
	);

	const renderBackMain = () => (
		<TopNavigationAction icon={BackIcon} onPress={() => setIsMain(true)} />
	);

	const toggleMenu = () => {
		setMenuVisible(!menuVisible);
	};

	const renderMenuAction = () => (
		<TopNavigationAction icon={MenuIcon} onPress={toggleMenu} />
	);

	const renderRightActions = () => (
		<React.Fragment>
			<TopNavigationAction icon={MapIcon} onPress={onClickMapType} />
			<TopNavigationAction icon={ZoomIcon} onPress={onClickZoom} />
		</React.Fragment>
	);

	const renderRightLocation = () => (
		<Button size="small" onPress={() => setIsMain(true)}>
			Tiếp tục
		</Button>
	);

	const onRegionChange = (region) => {
		console.log(26999999, region);
		console.log(11111111, region.nativeEvent.coordinate);

		let lat = region.nativeEvent.coordinate.latitude;
		let lng = region.nativeEvent.coordinate.longitude;

		setCurrentLat(lat);
		setCurrentLong(lng);

		mapRef.current.animateToRegion({
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			latitudeDelta: 0.0122,
			longitudeDelta: 0.0121,
			// latitudeDelta: 0.009,
			// longitudeDelta: 0.001,
		});

		// fetchAddress(
		// 	region.nativeEvent.coordinate.latitude,
		// 	region.nativeEvent.coordinate.longitude
		// );
		// console.log(27000000, region.latitude)
	};

	// useEffect(() => {
	// 	ref.current?.setAddressText(addressInput);
	// }, []);

	const SubmitIcon = (props) => (
		<Button
			status="info"
			size="small"
			style={{ marginTop: 15 }}
			onPress={() => onClickCreate()}
		>
			{isUpdate == true ? "Lưu" : "Tạo"}
		</Button>
	);

	return (
		<SafeAreaView
			style={{
				backgroundColor: "#fff",
				height: Dimensions.get("window").height,
				paddingTop: Platform.OS === "android" ? 25 : 0,
			}}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.container}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					style={styles.scrollview}
				>
					<TouchableWithoutFeedback
						onPress={Keyboard.dismiss}
						style={{ width: "100%" }}
					>
						<View>
							{isMain == true && (
								<React.Fragment>
									<TopNavigation
										alignment="center"
										title={
											isUpdate == true
												? "Chỉnh sửa"
												: "Đăng ký mã bưu chính"
										}
										accessoryLeft={renderBackAction}
										accessoryRight={renderRightActions}
									/>
									<Divider />
									<Spinner visible={loading} />
									{/*{currentLat != null && currentLong != null && (*/}
									<MapView
										ref={mapRef}
										initialRegion={{
											latitude: parseFloat(currentLat),
											longitude: parseFloat(currentLong),
											// latitudeDelta: appConfigs.GOOGLE_MAP.latitudeDelta,
											// longitudeDelta: appConfigs.GOOGLE_MAP.longitudeDelta,
											latitudeDelta: 0.009,
											longitudeDelta: 0.001,
										}}
										mapType={mapType}
										//hiển thị chấm xanh
										showsUserLocation={
											true
											// isUpdate == true ? false : true
										}
										userLocationAnnotationTitle={
											"Vị trí của bạn"
											// isUpdate == true
											// 	? null
											// 	: "Vị trí của bạn"
										}
										showsMyLocationButton={true}
										// followsUserLocation={true}
										loadingEnabled={true}
										style={{
											width: mapWidth,
											height: mapHeight,
										}}
										showsBuildings={true}
										isAccessibilityElement={true}

										// onMapReady={() => {
										// 	// mapRef.fitToSuppliedMarkers(...)
										// 	// mapRef.current.fitToSuppliedMarkers(
										// 	// 	[
										// 	// 		"storeMarker", //'truckMarker',
										// 	// 	],
										// 	// 	{
										// 	// 		edgePadding: {
										// 	// 			top: 50,
										// 	// 			right: 50,
										// 	// 			bottom: 50,
										// 	// 			left: 50,
										// 	// 		},
										// 	// 	}
										// 	// );
										// }}
										// fitToCoordinates={{
										// 	coordinates: {
										// 		latitude: parseFloat(
										// 			currentLat
										// 		),
										// 		longitude: parseFloat(
										// 			currentLong
										// 		),
										// 	},
										// }}
										// onLayout={() => {
										// 	// mapRef.fitToSuppliedMarkers(
										// 	// 	{
										// 	// 		latitude: parseFloat(
										// 	// 			currentLat
										// 	// 		),
										// 	// 		longitude: parseFloat(
										// 	// 			currentLong
										// 	// 		),
										// 	// 	},
										// 	// 	false // not animated
										// 	// );
										// 	console.log(1)
										// 	// mapRef.fitToCoordinates(
										// 	// 	{
										// 	// 		latitude: parseFloat(
										// 	// 			currentLat
										// 	// 		),
										// 	// 		longitude: parseFloat(
										// 	// 			currentLong
										// 	// 		),
										// 	// 	},
										// 	// 	{
										// 	// 		edgePadding: {
										// 	// 			top: 10,
										// 	// 			right: 10,
										// 	// 			bottom: 10,
										// 	// 			left: 10,
										// 	// 		},
										// 	// 		animated: false,
										// 	// 	}
										// 	// )
										// }}
										// onLayout={() =>
										// 	mapRef.current.fitToCoordinates(
										// 		{
										// 			latitude: parseFloat(
										// 				currentLat
										// 			),
										// 			longitude: parseFloat(
										// 				currentLong
										// 			),
										// 		},
										// 		{
										// 			edgePadding: {
										// 				top: 10,
										// 				right: 10,
										// 				bottom: 10,
										// 				left: 10,
										// 			},
										// 			animated: true,
										// 		}
										// 	)
										// }
										// onLayout={() => {
										// 	console.log("mapReady...");

										// 	// This orientates the map with the origin on bottom and destination on top
										// 	// You can see that when the map first loads,
										// 	// but the map isn't fit to the points
										// 	// mapRef.current.setCamera({
										// 	// 	,
										// 	// });

										// 	// 5 seconds after the map loads,
										// 	// this runs and does fit the map to the points,
										// 	// but it sets the heading back to 0
										// 	// setTimeout(() => {
										// 	// 	console.log(
										// 	// 		"fitting to coordinates"
										// 	// 	);
										// 	// 	mapRef.current.fitToCoordinates(
										// 	// 		[
										// 	// 			{
										// 	// 				latitude: parseFloat(
										// 	// 					currentLat
										// 	// 				),
										// 	// 				longitude: parseFloat(
										// 	// 					currentLong
										// 	// 				),
										// 	// 			},
										// 	// 			// destination,
										// 	// 		],
										// 	// 		{
										// 	// 			animated: true,
										// 	// 		}
										// 	// 	);
										// 	// }, 1000);
										// }}
										// scrollEnabled={true}
										// fitToElements={true}
										// customMapStyle={mapStyle}
									>
										<MapView.Marker
											identifier={"storeMarker"}
											key={"marker_here"}
											draggable
											coordinate={{
												latitude: parseFloat(
													currentLat
												),
												longitude: parseFloat(
													currentLong
												),
											}}
											onSelect={(e) =>
												console.log("onSelect", e)
											}
											// onDrag={(e) => console.log("onDrag", e)}
											// onDragStart={(e) => console.log("onDragStart", e)}
											onDragEnd={(region) =>
												onRegionChange(region)
											}
											onPress={(e) =>
												console.log("onPress", e)
											}
										/>
									</MapView>

									{/*)}*/}

									<Text
										style={{
											marginTop: 5,
											paddingTop: 6,
											paddingHorizontal: 10,
											paddingBottom: 8,
										}}
									>
										Tên địa điểm
									</Text>
									<Input
										style={{ paddingHorizontal: 10 }}
										placeholder=""
										value={nameInput}
										onChangeText={(text) =>
											setNameInput(text)
										}
									/>
									{/*<Text
										style={{
											marginTop: 5,
											paddingTop: 6,
											paddingHorizontal: 10,
											paddingBottom: 8,
										}}
									>
										Số điện thoại
									</Text>
									<Input
										style={{ paddingHorizontal: 10 }}
										placeholder=""
										value={phoneInput}
										keyboardType="number-pad"
										onChangeText={(text) =>
											setPhoneInput(text)
										}
										keyboardType="numeric"
									/>*/}
									<Text
										style={{
											marginTop: 5,
											paddingTop: 6,
											paddingHorizontal: 10,
											paddingBottom: 8,
										}}
									>
										Địa chỉ
									</Text>
									<Select
										placeholder="Chọn tỉnh thành"
										value={displayLevel1}
										selectedIndex={indexLevel1}
										onSelect={(index) => {
											selectAreaLevel1(index.row);
										}}
										style={{
											paddingHorizontal: 10,
											paddingBottom: 10,
										}}
									>
										{DataPostalLevel1.map((postal, i) => (
											<SelectItem
												key={i}
												title={postal.name}
											/>
										))}
									</Select>
									<Select
										placeholder="Chọn quận/huyện"
										value={displayLevel2}
										selectedIndex={indexLevel2}
										onSelect={(index) => {
											selectAreaLevel2(index.row);
										}}
										style={{
											paddingHorizontal: 10,
											paddingBottom: 10,
										}}
									>
										{dataPostalLevel2.map((postal, i) => (
											<SelectItem
												key={i}
												title={postal.name.replace(
													" tỉnh " + displayLevel1,
													""
												)}
											/>
										))}
									</Select>
									<Select
										placeholder="Chọn tỉnh thành"
										value={displayLevel3}
										selectedIndex={indexLevel3}
										onSelect={(index) => {
											selectAreaLevel3(index.row);
										}}
										style={{
											paddingHorizontal: 10,
											paddingBottom: 10,
										}}
									>
										{dataPostalLevel3.map((postal, i) => (
											<SelectItem
												key={i}
												title={postal.name
													.replace(
														"tỉnh " + displayLevel1,
														""
													)
													.replace(
														"" + displayLevel2,
														""
													)}
											/>
										))}
									</Select>
									<Text
										style={{
											marginTop: 5,
											paddingTop: 6,
											paddingHorizontal: 10,
											paddingBottom: 8,
										}}
									>
										Mã bưu chính: {codeArea}
									</Text>
									<Text
										style={{
											marginTop: 5,
											paddingTop: 6,
											paddingHorizontal: 10,
											paddingBottom: 8,
										}}
									>
										Địa chỉ (số nhà, đường)
									</Text>
									<Input
										style={{ paddingHorizontal: 10 }}
										placeholder=""
										value={addressInput}
										onChangeText={(text) =>
											setAddressInput(text)
										}
									/>

									{/*<Text
								style={{
									marginTop: 5,
									paddingTop: 6,
									paddingHorizontal: 10,
									paddingBottom: 8,
								}}
							>
								Địa chỉ
							</Text>
							<TouchableOpacity onPress={() => setIsMain(false)}>
								<View style={styles.input}>
									<Text style={styles.input_text}>
										{addressInput
											? addressInput
											: "Nhập địa chỉ của bạn"}
									</Text>
								</View>
							</TouchableOpacity>*/}

									<Button
										style={{
											marginHorizontal: 10,
											marginTop: 15,
										}}
										onPress={() => onClickCreate()}
									>
										{isUpdate == true ? "Lưu" : "Đăng ký"}
									</Button>
								</React.Fragment>
							)}

							{isMain == false && (
								<React.Fragment>
									<TopNavigation
										alignment="center"
										title="Nhập địa chỉ của bạn"
										accessoryLeft={renderBackMain}
										accessoryRight={renderRightLocation}
									/>
									<Divider />

									<GooglePlacesAutocomplete
										// ref={mapRef}
										placeholder="Tìm kiếm"
										query={{
											key:
												appConfigs.GOOGLE_MAP.API_KEY_2,
											language: "vi", // language of the results
											components: "country:vn",
										}}
										onPress={(data, details = null) => {
											console.log(data);
											console.log(348, data.description);
											setAddressInput(data.description);
											fetchGeocode(data.description);
											// setIsMain(true);
										}}
										onFail={(error) => console.error(error)}
										// requestUrl={{
										// 	url:
										// 		"https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api",
										// 	useOnPlatform: "web",
										// }} // this in only required for use on the web. See https://git.io/JflFv more for details.
										// currentLocation={true}
										// currentLocationLabel="Hiện tại"
										styles={{
											textInputContainer: {
												borderColor: "#e4e6ef",
												padding: 10,
												backgroundColor: "#e4e6ef",
											},
											textInput: {
												borderColor: "#e4e6ef",
												height: 38,
												color: "#5d5d5d",
												fontSize: 16,
											},
											predefinedPlacesDescription: {
												color: "#1faadb",
											},
										}}
									/>
								</React.Fragment>
							)}
						</View>
					</TouchableWithoutFeedback>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

// STYLES
const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "column",
	},
	head: {
		backgroundColor: "#fff",
		width: "100%",
		marginTop: 50,
		marginBottom: 0,
		paddingHorizontal: 25,
		paddingVertical: 10,
		margin: 0,
		borderBottomColor: "#879299",
		borderBottomWidth: 1,
		height: 50,
		// position: "absolute",
	},
	// mapStyle: {
	// 	width: Dimensions.get("window").width,
	// 	height: 200,
	// },
	input: {
		backgroundColor: "rgb(247, 249, 252)",
		borderColor: "#rgb(228, 233, 242)",
		height: 45,
		borderWidth: 1,
		borderRadius: 11,
		paddingHorizontal: 10,
		marginLeft: 10,
		marginRight: 10,
		paddingVertical: 10,
		// justifyContent: "center",
		alignItems: "center",
		flexDirection: "row",
	},
	input_icon: {
		color: "rgba(0, 0, 0, 0.4)",
		marginRight: 10,
	},
	input_text: {
		color: "rgba(0, 0, 0, 0.45)",
		fontSize: 15,
	},
});

function mapDispatchToProps(dispatch) {
	return {
		storeData: function (token) {
			dispatch({ type: "saveToken", token });
		},
		storeUserInfo: function (infos) {
			dispatch({ type: "saveUserInfo", infos });
		},
	};
}

function mapStateToProps(state) {
	return { infos: state.infos, token: state.token };
}

// keep this line at the end
export default connect(
	mapStateToProps,
	mapDispatchToProps
)(createPostalLocationScreen);
